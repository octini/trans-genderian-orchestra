/** @jsxImportSource @opentui/solid */
//
// This file is never shipped to npm as-is: `npm run build` compiles it (and
// everything it imports) into dist/tui.js with the Solid *universal* JSX
// transform baked in, and that is load-bearing. opencode's runtime Solid
// transform explicitly skips files under node_modules, so raw .tsx in a
// published install falls back to the plain jsx-runtime: the panel renders
// once with current values and never reacts again — no error, just a frozen
// panel. A path-loaded dev checkout also loads dist/tui.js (package.json
// exports), so rebuild after editing.

import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { type Accessor, createMemo, createSignal, For, getOwner, type Owner, runWithOwner, Show } from "solid-js"
import { type BdClient, type Bead, createBdClient } from "./bd"
import { registerCommands, showBead } from "./commands"
import { debug } from "./debug"
import { type BeadState, focusKey, type PanelData, type PanelItem, resolveScope } from "./scope"

/** How often we stat `.beads/last-touched` looking for changes. */
const POLL_MS = 1_500

/** Ceiling for the failure backoff: a persistently broken bd polls half a minute. */
const MAX_POLL_MS = 30_000

export type Store = ReturnType<typeof createStore>

type Kv = {
  get: <Value = unknown>(key: string, fallback?: Value) => Value
  set: (key: string, value: unknown) => void
}

/**
 * Holds the panel's view of beads and keeps it fresh.
 *
 * Refreshes are driven by the mtime of `.beads/last-touched` rather than by a
 * timer alone, so an idle repo costs one `stat` per tick and no subprocesses.
 */
export function createStore(bd: BdClient, kv: Kv) {
  const [data, setData] = createSignal<PanelData | undefined>(undefined)
  const [sessionID, setSessionID] = createSignal<string | undefined>(undefined)

  let lastSignature: string | undefined
  let inFlight = false
  /** A refresh requested while one was in flight; any number coalesce to one. */
  let pending: { force: boolean } | undefined
  /**
   * Current poll cadence. Doubles per consecutive failed refresh (capped at
   * MAX_POLL_MS) so a broken bd doesn't spin, and resets on success.
   */
  let pollDelay = POLL_MS

  /**
   * The reactive owner the sidebar slot renders under.
   *
   * Updating the signal from a timer or a promise callback would otherwise run
   * outside that owner, and @opentui/solid needs it to find the live renderer —
   * without it, re-rendering the panel throws "No renderer found" and the
   * section silently stays empty.
   */
  let owner: Owner | null = null

  function adopt(next: Owner | null) {
    if (next) owner = next
  }

  function commit(next: PanelData | undefined) {
    if (owner) runWithOwner(owner, () => setData(next))
    else setData(next)
  }

  function pinned(): string | undefined {
    const id = sessionID()
    if (!id) return undefined
    const value = kv.get<string>(focusKey(id), "")
    return typeof value === "string" && value.length > 0 ? value : undefined
  }

  function pin(epicID: string | undefined) {
    const id = sessionID()
    if (!id) return
    debug(`pin epic=${epicID ?? "-"} session=${id}`)
    // TuiKV (see @opencode-ai/plugin's tui.d.ts) exposes only get/set, no
    // delete — unfocus can't remove the key, so a dead session's entry
    // lingers in the host's persistent kv for good. Writing "" is the closest
    // available approximation of "unset".
    kv.set(focusKey(id), epicID ?? "")
    void refresh(true)
  }

  async function refresh(force = false) {
    // Overlapping refreshes would race to set the signal out of order, and a bd
    // call outlives a poll tick often enough for that to happen in practice.
    // A request that arrives mid-flight can't just be dropped, though: the
    // in-flight refresh holds pre-mutation data, and its final snapshot would
    // mask the change from the poll loop. Record it and re-run once instead.
    if (inFlight) {
      pending = { force: pending?.force || force }
      return
    }
    inFlight = true
    try {
      if (force) bd.invalidate()
      bd.beginRefresh()
      const next = await resolveScope(bd, pinned())
      debug(`refresh items=${next?.items.length ?? "none"} epic=${next?.epic?.id ?? "-"}`)
      commit(next)
      pollDelay = POLL_MS
    } catch (err) {
      debug(`refresh threw ${String(err)}`)
      // Commit an explicit error state rather than undefined: undefined makes
      // the panel vanish (indistinguishable from plugin-not-loaded), while an
      // error line tells the user bd is broken and that /bd-refresh retries.
      pollDelay = Math.min(pollDelay * 2, MAX_POLL_MS)
      commit({ epic: undefined, items: [], done: 0, total: 0, fallback: false, error: String(err), hiddenClosed: 0 })
    } finally {
      // Snapshot *after* querying, not before: some bd reads rewrite
      // `.beads/last-touched` themselves, and sampling first would make our own
      // queries look like an external change and refresh in a loop.
      lastSignature = bd.snapshot()
      inFlight = false
      // A rerun happens only when a request actually arrived mid-flight, so
      // this settles as soon as requests stop — no self-sustaining loop.
      if (pending) {
        const { force: pendingForce } = pending
        pending = undefined
        void refresh(pendingForce)
      }
    }
  }

  function start(): () => void {
    void refresh(true)
    let timer: ReturnType<typeof setTimeout> | undefined
    const tick = () => {
      // After a failed refresh the panel shows the error state; retry on the
      // next tick even though nothing changed on disk — lastSignature was
      // updated by the failed pass, so waiting for a signature change would
      // pin the error until some external bd write (tgo-hv6).
      const failed = data()?.error !== undefined
      if (failed || bd.signature() !== lastSignature) void refresh()
      timer = setTimeout(tick, pollDelay)
    }
    timer = setTimeout(tick, pollDelay)
    return () => clearTimeout(timer)
  }

  return { data, refresh, start, pin, pinned, sessionID, setSessionID, adopt }
}

/** Beads' own glyphs, from `bd statuses`, so the panel reads like the CLI. */
const GLYPH: Record<BeadState, string> = {
  closed: "✓",
  in_progress: "◐",
  blocked: "●",
  ready: "○",
  open: "○",
  deferred: "❄",
  // `bd` prints 📌 for pinned, but a double-width emoji breaks column alignment
  // in a narrow sidebar, so we use a single-width stand-in.
  pinned: "◆",
  hooked: "◇",
}

/** Rows longer than a couple of items collapse, matching the built-in panels. */
const COLLAPSE_THRESHOLD = 2

/**
 * Footer text for the hidden-closed count.
 *
 * Returns the literal "N closed hidden" string when the panel should show it,
 * otherwise undefined. Centralizes the footer render branch so tests can assert
 * the literal output without mounting the full terminal renderer — the BeadsPanel
 * itself calls this exact export.
 */
export function closedHiddenFooter(data: PanelData | undefined): string | undefined {
  if (!data) return undefined
  if (data.error) return undefined
  const count = data.hiddenClosed ?? 0
  if (count <= 0) return undefined
  return `${count} closed hidden`
}

export function BeadsPanel(props: {
  api: TuiPluginApi
  data: () => PanelData | undefined
  adopt: (owner: Owner | null) => void
  onSelect: (item: PanelItem) => void
}) {
  const [expanded, setExpanded] = createSignal(true)
  const theme = () => props.api.theme.current

  // The component body runs inside the renderer's reactive context; the slot
  // callback that created it does not. Capturing the owner here is what lets a
  // background refresh re-render the panel without "No renderer found".
  props.adopt(getOwner())

  const items = createMemo(() => props.data()?.items ?? [])
  const collapsible = createMemo(() => items().length > COLLAPSE_THRESHOLD)
  const visible = createMemo(() => (collapsible() && !expanded() ? [] : items()))
  const footerText = createMemo(() => closedHiddenFooter(props.data()))

  const heading = createMemo(() => {
    const data = props.data()
    if (!data) return ""
    if (data.fallback) return `${data.items.length} open`
    const pct = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0
    return `${pct}% (${data.done}/${data.total})`
  })

  return (
    <Show when={props.data()}>
      {(data: Accessor<PanelData>) => (
        <Show
          when={data().error}
          fallback={
            <box>
              <box flexDirection="row" gap={1} onMouseDown={() => collapsible() && setExpanded((it) => !it)}>
                <Show when={collapsible()}>
                  <text fg={theme().text}>{expanded() ? "▼" : "▶"}</text>
                </Show>
                <text fg={theme().text}>
                  <b>Beads</b>
                </text>
                <Show when={data().epic}>
                  {(epic: Accessor<Bead>) => (
                    <text fg={theme().textMuted} wrapMode="none">
                      {epic().id}
                    </text>
                  )}
                </Show>
                <text fg={theme().textMuted}>{heading()}</text>
              </box>

              <For each={visible()}>{(item) => <Row api={props.api} item={item} onSelect={props.onSelect} />}</For>
              <Show when={footerText() !== undefined}>
                <text fg={theme().textMuted}>{footerText()!}</text>
              </Show>
            </box>
          }
        >
          {/* A failed refresh renders an explicit error line rather than nothing:
              an absent section is indistinguishable from plugin-not-loaded. */}
          <box flexDirection="row" gap={1}>
            <text fg={theme().text}>
              <b>Beads</b>
            </text>
            <text fg={theme().textMuted} wrapMode="none">
              {`unavailable — ${shortError(data().error ?? "")}; /bd-refresh to retry`}
            </text>
          </box>
        </Show>
      )}
    </Show>
  )
}

/** Collapse a refresh failure to one row: first non-empty line, capped. */
function shortError(text: string): string {
  const line = text.split(/\r?\n/).find((it) => it.trim().length > 0) ?? text
  return line.length > 80 ? `${line.slice(0, 79)}…` : line
}

function Row(props: { api: TuiPluginApi; item: PanelItem; onSelect: (item: PanelItem) => void }) {
  const theme = () => props.api.theme.current

  // Mirrors the built-in Todo panel: muted by default, warning for the row
  // actually being worked on, so the eye lands on it first.
  const color = () => {
    switch (props.item.state) {
      case "in_progress":
        return theme().warning
      case "blocked":
        return theme().error
      case "ready":
        return theme().text
      default:
        return theme().textMuted
    }
  }

  return (
    <box flexDirection="row" gap={0} onMouseDown={() => props.onSelect(props.item)}>
      <text flexShrink={0} style={{ fg: color() }}>
        [{GLYPH[props.item.state] ?? " "}]{" "}
      </text>
      <text flexGrow={1} wrapMode="word" style={{ fg: color() }}>
        {props.item.bead.title ?? props.item.bead.id}
      </text>
    </box>
  )
}

/**
 * Sits between the built-in Todo panel (400) and Modified Files (500). The host
 * renders `sidebar_content` without a slot mode, which defaults to "append", so
 * this section coexists with the built-ins rather than replacing them.
 */
const SIDEBAR_ORDER = 450

const tui: TuiPlugin = async (api) => {
  const bd = createBdClient(api.state.path.worktree)
  // Field diagnosis for an invisible panel (tgo-hv6): record which worktree the
  // factory captured and whether a beads database exists there at all.
  debug(`init worktree=${api.state.path.worktree} enabled=${bd.enabled()}`)
  const store = createStore(bd, api.kv)

  const stopPolling = store.start()
  const unregisterCommands = registerCommands(api, bd, store)

  api.lifecycle.onDispose(() => {
    stopPolling()
    unregisterCommands()
  })

  api.slots.register({
    order: SIDEBAR_ORDER,
    slots: {
      sidebar_content(_ctx, value) {
        // The panel is per-session only insofar as the focus pin is; keeping
        // the id current lets `/bd-focus` scope itself to the open session.
        store.setSessionID(value.session_id)
        return (
          <BeadsPanel
            api={api}
            data={store.data}
            adopt={store.adopt}
            onSelect={(item) => void showBead(api, bd, item)}
          />
        )
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id: "trans-genderian-orchestra",
  tui,
}

export default plugin
