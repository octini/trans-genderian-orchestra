// src/sidebar/tui.tsx
import { createMemo, createSignal, For, getOwner, runWithOwner, Show } from "solid-js";

// src/sidebar/bd.ts
import { execFile } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
var run = promisify(execFile);
var TIMEOUT_MS = 1e4;
var MAX_DEPTH = 5;
var MAX_ENTRIES = 400;
var VALID_BEAD_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
function isValidBeadID(id) {
  return VALID_BEAD_ID.test(id);
}
function createBdClient(worktree) {
  const beadsDir = join(worktree, ".beads");
  const lastTouched = join(beadsDir, "last-touched");
  const cache = new Map;
  let pinnedSignature;
  function enabled() {
    return existsSync(beadsDir);
  }
  function computeSignature() {
    let newest = 0;
    let seen = 0;
    try {
      newest = statSync(beadsDir).mtimeMs;
    } catch {}
    const walk = (dir, depth) => {
      if (depth > MAX_DEPTH || seen >= MAX_ENTRIES)
        return;
      let entries;
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (seen++ >= MAX_ENTRIES)
          return;
        const full = join(dir, entry.name);
        try {
          const mtime = statSync(full).mtimeMs;
          if (mtime > newest)
            newest = mtime;
        } catch {
          continue;
        }
        if (entry.isDirectory())
          walk(full, depth + 1);
      }
    };
    walk(beadsDir, 0);
    return `${newest}:${seen}`;
  }
  function signature() {
    return pinnedSignature ?? computeSignature();
  }
  function beginRefresh() {
    pinnedSignature = computeSignature();
  }
  function snapshot() {
    pinnedSignature = undefined;
    return computeSignature();
  }
  function lastTouchedID() {
    try {
      const id = readFileSync(lastTouched, "utf8").trim();
      return isValidBeadID(id) ? id : undefined;
    } catch {
      return;
    }
  }
  async function exec(args) {
    const { stdout } = await run("bd", args, {
      cwd: worktree,
      timeout: TIMEOUT_MS,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024
    });
    return stdout;
  }
  async function query(args) {
    if (!enabled())
      return;
    const key = args.join("\x00");
    const sig = signature();
    const hit = cache.get(key);
    if (hit) {
      if (hit.signature === sig)
        return hit.value;
      cache.delete(key);
    }
    try {
      const stdout = await exec(["--readonly", ...args, "--json"]);
      const trimmed = stdout.trim();
      const value = trimmed.length > 0 ? JSON.parse(trimmed) : undefined;
      for (const [k, v] of cache)
        if (v.signature !== sig)
          cache.delete(k);
      cache.set(key, { signature: sig, value });
      return value;
    } catch {
      return;
    }
  }
  async function mutate(id, args) {
    if (!isValidBeadID(id))
      return { ok: false, message: `invalid bead id: ${id}` };
    try {
      await exec(args);
      cache.clear();
      return { ok: true };
    } catch (err) {
      cache.clear();
      return { ok: false, message: messageFor(err) };
    }
  }
  function invalidate() {
    cache.clear();
  }
  return {
    enabled,
    signature,
    beginRefresh,
    snapshot,
    lastTouchedID,
    invalidate,
    mutate,
    children: (id) => isValidBeadID(id) ? query(["children", id]) : Promise.resolve(undefined),
    get: (id) => isValidBeadID(id) ? query(["list", "--id", id, "--all"]) : Promise.resolve(undefined),
    ready: () => query(["ready"]),
    list: (args = []) => query(["list", ...args]),
    epics: () => query(["list", "--type", "epic", "--all"])
  };
}
function messageFor(err) {
  if (err && typeof err === "object") {
    const e = err;
    const stderr = typeof e.stderr === "string" ? e.stderr.trim() : "";
    if (stderr)
      return firstLine(stderr);
    if (e.code === "ENOENT")
      return "bd not found on PATH";
    if (typeof e.message === "string")
      return firstLine(e.message);
  }
  return String(err);
}
function firstLine(text) {
  const line = text.split(/\r?\n/).find((it) => it.trim().length > 0);
  return (line ?? text).trim();
}

// src/sidebar/commands.ts
var COMMANDS = [
  "beads.focus",
  "beads.unfocus",
  "beads.start",
  "beads.close",
  "beads.reopen",
  "beads.refresh"
];
function registerCommands(api, bd, store) {
  async function apply(id, args, describe) {
    const result = await bd.mutate(id, args);
    if (!result.ok) {
      api.ui.toast({ variant: "error", title: "beads", message: result.message });
    } else {
      api.ui.toast({ variant: "success", title: "beads", message: describe });
    }
    await store.refresh(true);
  }
  function pick(title, items, onSelect) {
    if (items.length === 0) {
      api.ui.toast({ variant: "info", title: "beads", message: "nothing to pick" });
      return;
    }
    api.ui.dialog.replace(() => api.ui.DialogSelect({
      title,
      options: items.map((item) => ({
        title: item.bead.title ?? item.bead.id,
        description: `${item.bead.id} · ${item.state}`,
        value: item
      })),
      onSelect: (option) => {
        api.ui.dialog.clear();
        onSelect(option.value);
      }
    }));
  }
  function pickFrom(title, filter, run2) {
    const items = (store.data()?.items ?? []).filter(filter);
    pick(title, items, run2);
  }
  const layer = api.keymap.registerLayer({
    commands: [
      {
        name: "beads.focus",
        title: "Beads: focus an epic",
        desc: "Pin the sidebar to a specific epic for this session",
        category: "Beads",
        namespace: "palette",
        slashName: "bd-focus",
        async run() {
          const epics = await bd.epics() ?? [];
          if (epics.length === 0) {
            api.ui.toast({ variant: "info", title: "beads", message: "no epics in this workspace" });
            return;
          }
          api.ui.dialog.replace(() => api.ui.DialogSelect({
            title: "Focus epic",
            options: epics.map((epic) => ({
              title: epic.title ?? epic.id,
              description: `${epic.id} · ${epic.status ?? "open"}`,
              value: epic.id
            })),
            onSelect: (option) => {
              api.ui.dialog.clear();
              store.pin(String(option.value));
            }
          }));
        }
      },
      {
        name: "beads.unfocus",
        title: "Beads: clear focus",
        desc: "Go back to following whichever bead was last touched",
        category: "Beads",
        namespace: "palette",
        slashName: "bd-unfocus",
        run() {
          store.pin(undefined);
        }
      },
      {
        name: "beads.start",
        title: "Beads: start work",
        desc: "Mark a bead in progress",
        category: "Beads",
        namespace: "palette",
        slashName: "bd-start",
        run() {
          pickFrom("Start work", (item) => item.state !== "closed" && item.state !== "in_progress", (item) => void apply(item.bead.id, ["update", item.bead.id, "--status", "in_progress"], `started ${item.bead.id}`));
        }
      },
      {
        name: "beads.close",
        title: "Beads: close",
        desc: "Close a bead in the current plan",
        category: "Beads",
        namespace: "palette",
        slashName: "bd-close",
        run() {
          pickFrom("Close bead", (item) => item.state !== "closed", (item) => void apply(item.bead.id, ["close", item.bead.id], `closed ${item.bead.id}`));
        }
      },
      {
        name: "beads.reopen",
        title: "Beads: reopen",
        desc: "Reopen a closed bead",
        category: "Beads",
        namespace: "palette",
        slashName: "bd-reopen",
        async run() {
          const closed = (store.data()?.items ?? []).filter((item) => item.state === "closed");
          const items = closed.length > 0 ? closed : (await bd.list(["--status", "closed"]) ?? []).map((bead) => ({ bead, state: "closed" }));
          pick("Reopen bead", items, (item) => void apply(item.bead.id, ["reopen", item.bead.id], `reopened ${item.bead.id}`));
        }
      },
      {
        name: "beads.refresh",
        title: "Beads: refresh",
        desc: "Re-read beads now",
        category: "Beads",
        namespace: "palette",
        slashName: "bd-refresh",
        run() {
          store.refresh(true);
        }
      }
    ],
    bindings: api.tuiConfig.keybinds.gather("beads", [...COMMANDS])
  });
  return typeof layer === "function" ? layer : () => {};
}
async function showBead(api, bd, item) {
  const bead = (await bd.get(item.bead.id))?.[0] ?? item.bead;
  const lines = [
    `${bead.id}  ${bead.status ?? "open"}${bead.issue_type ? ` · ${bead.issue_type}` : ""}`,
    "",
    bead.title ?? "",
    "",
    typeof bead.description === "string" && bead.description.length > 0 ? bead.description : "(no description)"
  ];
  if (typeof bead.acceptance_criteria === "string" && bead.acceptance_criteria.length > 0) {
    lines.push("", "Acceptance:", bead.acceptance_criteria);
  }
  api.ui.dialog.replace(() => api.ui.DialogAlert({
    title: bead.title ?? bead.id,
    message: lines.join(`
`)
  }));
}

// src/sidebar/debug.ts
import { appendFileSync } from "node:fs";
var SINK = process.env.BEADS_SIDEBAR_DEBUG;
function debug(line) {
  if (!SINK)
    return;
  try {
    appendFileSync(SINK, `${new Date().toISOString()} ${line}
`);
  } catch {}
}

// src/sidebar/scope.ts
function focusKey(sessionID) {
  return `beads.focus.${sessionID}`;
}
var CONTAINER_TYPES = new Set(["epic", "molecule"]);
async function resolveScope(bd, pinned) {
  if (!bd.enabled())
    return;
  const readyResult = await bd.ready();
  const ready = readyResult ? new Set(readyResult.map((it) => it.id)) : undefined;
  if (pinned) {
    const scoped = await epicScope(bd, pinned, ready);
    if (scoped)
      return scoped;
  }
  const touched = bd.lastTouchedID();
  if (touched) {
    const bead = (await bd.get(touched))?.[0];
    if (bead) {
      const epicID = bead.issue_type === "epic" ? bead.id : bead.parent;
      if (typeof epicID === "string" && epicID.length > 0) {
        const scoped = await epicScope(bd, epicID, ready);
        if (scoped)
          return scoped;
      }
    }
  }
  return workspaceScope(bd, ready);
}
async function epicScope(bd, epicID, ready) {
  const epic = (await bd.get(epicID))?.[0];
  if (!epic)
    return;
  const children = await bd.children(epicID) ?? [];
  if (children.length === 0)
    return;
  const all = children.filter((it) => it.id !== epicID).sort(byID).map((bead) => ({ bead, state: stateOf(bead, ready) }));
  const hiddenClosed = all.filter((it) => it.state === "closed").length;
  const items = all.filter((it) => it.state !== "closed");
  return {
    epic,
    items,
    done: hiddenClosed,
    total: all.length,
    fallback: false,
    hiddenClosed
  };
}
async function workspaceScope(bd, ready) {
  const open = await bd.list(["--all"]) ?? [];
  const all = open.filter((it) => !CONTAINER_TYPES.has(it.issue_type ?? "")).map((bead) => ({ bead, state: stateOf(bead, ready) })).sort(byUrgency);
  if (all.length === 0)
    return;
  const hiddenClosed = all.filter((it) => it.state === "closed").length;
  const items = all.filter((it) => it.state !== "closed");
  if (items.length === 0 && hiddenClosed === 0)
    return;
  return {
    items,
    done: hiddenClosed,
    total: all.length,
    fallback: true,
    hiddenClosed
  };
}
function stateOf(bead, ready) {
  const status = typeof bead.status === "string" ? bead.status : "open";
  switch (status) {
    case "closed":
      return "closed";
    case "in_progress":
      return "in_progress";
    case "blocked":
      return "blocked";
    case "deferred":
      return "deferred";
    case "pinned":
      return "pinned";
    case "hooked":
      return "hooked";
    default:
      if (!ready)
        return "open";
      return ready.has(bead.id) ? "ready" : "blocked";
  }
}
function byID(a, b) {
  return a.id.localeCompare(b.id, undefined, { numeric: true });
}
function byUrgency(a, b) {
  const rank = (item) => item.state === "in_progress" ? 0 : item.state === "ready" || item.state === "open" ? 1 : item.state === "blocked" ? 2 : 3;
  const byRank = rank(a) - rank(b);
  if (byRank !== 0)
    return byRank;
  return byID(a.bead, b.bead);
}

// src/sidebar/tui.tsx
import { jsxDEV } from "@opentui/solid/jsx-dev-runtime";
var POLL_MS = 1500;
var MAX_POLL_MS = 30000;
function createStore(bd, kv) {
  const [data, setData] = createSignal(undefined);
  const [sessionID, setSessionID] = createSignal(undefined);
  let lastSignature;
  let inFlight = false;
  let pending;
  let pollDelay = POLL_MS;
  let owner = null;
  function adopt(next) {
    if (next)
      owner = next;
  }
  function commit(next) {
    if (owner)
      runWithOwner(owner, () => setData(next));
    else
      setData(next);
  }
  function pinned() {
    const id = sessionID();
    if (!id)
      return;
    const value = kv.get(focusKey(id), "");
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }
  function pin(epicID) {
    const id = sessionID();
    if (!id)
      return;
    debug(`pin epic=${epicID ?? "-"} session=${id}`);
    kv.set(focusKey(id), epicID ?? "");
    refresh(true);
  }
  async function refresh(force = false) {
    if (inFlight) {
      pending = { force: pending?.force || force };
      return;
    }
    inFlight = true;
    try {
      if (force)
        bd.invalidate();
      bd.beginRefresh();
      const next = await resolveScope(bd, pinned());
      debug(`refresh items=${next?.items.length ?? "none"} epic=${next?.epic?.id ?? "-"}`);
      commit(next);
      pollDelay = POLL_MS;
    } catch (err) {
      debug(`refresh threw ${String(err)}`);
      pollDelay = Math.min(pollDelay * 2, MAX_POLL_MS);
      commit({ epic: undefined, items: [], done: 0, total: 0, fallback: false, error: String(err), hiddenClosed: 0 });
    } finally {
      lastSignature = bd.snapshot();
      inFlight = false;
      if (pending) {
        const { force: pendingForce } = pending;
        pending = undefined;
        refresh(pendingForce);
      }
    }
  }
  function start() {
    refresh(true);
    let timer;
    const tick = () => {
      const failed = data()?.error !== undefined;
      if (failed || bd.signature() !== lastSignature)
        refresh();
      timer = setTimeout(tick, pollDelay);
    };
    timer = setTimeout(tick, pollDelay);
    return () => clearTimeout(timer);
  }
  return { data, refresh, start, pin, pinned, sessionID, setSessionID, adopt };
}
var GLYPH = {
  closed: "✓",
  in_progress: "◐",
  blocked: "●",
  ready: "○",
  open: "○",
  deferred: "❄",
  pinned: "◆",
  hooked: "◇"
};
var COLLAPSE_THRESHOLD = 2;
function BeadsPanel(props) {
  const [expanded, setExpanded] = createSignal(true);
  const theme = () => props.api.theme.current;
  props.adopt(getOwner());
  const items = createMemo(() => props.data()?.items ?? []);
  const collapsible = createMemo(() => items().length > COLLAPSE_THRESHOLD);
  const visible = createMemo(() => collapsible() && !expanded() ? [] : items());
  const hiddenClosed = createMemo(() => props.data()?.hiddenClosed ?? 0);
  const heading = createMemo(() => {
    const data = props.data();
    if (!data)
      return "";
    if (data.fallback)
      return `${data.items.length} open`;
    const pct = data.total > 0 ? Math.round(data.done / data.total * 100) : 0;
    return `${pct}% (${data.done}/${data.total})`;
  });
  return /* @__PURE__ */ jsxDEV(Show, {
    when: props.data(),
    children: (data) => /* @__PURE__ */ jsxDEV(Show, {
      when: data().error,
      fallback: /* @__PURE__ */ jsxDEV("box", {
        children: [
          /* @__PURE__ */ jsxDEV("box", {
            flexDirection: "row",
            gap: 1,
            onMouseDown: () => collapsible() && setExpanded((it) => !it),
            children: [
              /* @__PURE__ */ jsxDEV(Show, {
                when: collapsible(),
                children: /* @__PURE__ */ jsxDEV("text", {
                  fg: theme().text,
                  children: expanded() ? "▼" : "▶"
                }, undefined, false, undefined, this)
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsxDEV("text", {
                fg: theme().text,
                children: /* @__PURE__ */ jsxDEV("b", {
                  children: "Beads"
                }, undefined, false, undefined, this)
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsxDEV(Show, {
                when: data().epic,
                children: (epic) => /* @__PURE__ */ jsxDEV("text", {
                  fg: theme().textMuted,
                  wrapMode: "none",
                  children: epic().id
                }, undefined, false, undefined, this)
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsxDEV("text", {
                fg: theme().textMuted,
                children: heading()
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsxDEV(For, {
            each: visible(),
            children: (item) => /* @__PURE__ */ jsxDEV(Row, {
              api: props.api,
              item,
              onSelect: props.onSelect
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV(Show, {
            when: hiddenClosed() > 0,
            children: /* @__PURE__ */ jsxDEV("text", {
              fg: theme().textMuted,
              children: `${hiddenClosed()} closed hidden`
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      children: /* @__PURE__ */ jsxDEV("box", {
        flexDirection: "row",
        gap: 1,
        children: [
          /* @__PURE__ */ jsxDEV("text", {
            fg: theme().text,
            children: /* @__PURE__ */ jsxDEV("b", {
              children: "Beads"
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV("text", {
            fg: theme().textMuted,
            wrapMode: "none",
            children: `unavailable — ${shortError(data().error ?? "")}; /bd-refresh to retry`
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    }, undefined, false, undefined, this)
  }, undefined, false, undefined, this);
}
function shortError(text) {
  const line = text.split(/\r?\n/).find((it) => it.trim().length > 0) ?? text;
  return line.length > 80 ? `${line.slice(0, 79)}…` : line;
}
function Row(props) {
  const theme = () => props.api.theme.current;
  const color = () => {
    switch (props.item.state) {
      case "in_progress":
        return theme().warning;
      case "blocked":
        return theme().error;
      case "ready":
        return theme().text;
      default:
        return theme().textMuted;
    }
  };
  return /* @__PURE__ */ jsxDEV("box", {
    flexDirection: "row",
    gap: 0,
    onMouseDown: () => props.onSelect(props.item),
    children: [
      /* @__PURE__ */ jsxDEV("text", {
        flexShrink: 0,
        style: { fg: color() },
        children: [
          "[",
          GLYPH[props.item.state] ?? " ",
          "]",
          " "
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsxDEV("text", {
        flexGrow: 1,
        wrapMode: "word",
        style: { fg: color() },
        children: props.item.bead.title ?? props.item.bead.id
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
var SIDEBAR_ORDER = 450;
var tui = async (api) => {
  const bd = createBdClient(api.state.path.worktree);
  debug(`init worktree=${api.state.path.worktree} enabled=${bd.enabled()}`);
  const store = createStore(bd, api.kv);
  const stopPolling = store.start();
  const unregisterCommands = registerCommands(api, bd, store);
  api.lifecycle.onDispose(() => {
    stopPolling();
    unregisterCommands();
  });
  api.slots.register({
    order: SIDEBAR_ORDER,
    slots: {
      sidebar_content(_ctx, value) {
        store.setSessionID(value.session_id);
        return /* @__PURE__ */ jsxDEV(BeadsPanel, {
          api,
          data: store.data,
          adopt: store.adopt,
          onSelect: (item) => void showBead(api, bd, item)
        }, undefined, false, undefined, this);
      }
    }
  });
};
var plugin = {
  id: "trans-genderian-orchestra",
  tui
};
var tui_default = plugin;
export {
  tui_default as default,
  createStore,
  BeadsPanel
};
