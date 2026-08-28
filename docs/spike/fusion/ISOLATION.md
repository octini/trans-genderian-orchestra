# ISOLATION — Proof the Fusion Spike Assets Cannot Ship

> Claim: `docs/spike/fusion/` is **outside** every install/reconcile read path. Placing the same files under `plugin/assets/agents/` would make them live (installed and reconciled by TGO 0.2.2 on every opencode start). This doc proves both halves with repo-relative paths, installer source excerpts, and the failure mode the isolation prevents.

---

## 1. Where the installer reads seats from (real source paths)

### 1.1 Canonical asset directory

```
plugin/assets/agents/          ← the ONLY directory the TGO pipeline scans for seats
  bernstein.md
  cobain.md
  dylan.md
  grohl.md
  horowitz.md
  nas.md
  nirvana.md
  novoselic.md
  presets.json (parallel, plugin/assets/presets.json)
```

Evidence — `plugin/src/build.ts` derives the asset dir from the package root (the folder that contains `package.json`) and always appends `assets/agents`:

```ts
// plugin/src/build.ts:6-9
const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
// … later:
export async function renderSeats(
  sourceDir: string,
  register: Register = "concise"
): Promise<RenderedSeat[]> {
  // plugin/src/build.ts:45-64 — readdir(sourceDir), filter *.md, render each
  const files = await fs.readdir(sourceDir).catch(/* warn */);
  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    // reads path.join(sourceDir, file)
  }
}

export async function buildSeatsTo(
  agentsDir: string,
  register: Register = "concise"
): Promise<RenderedSeat[]> {
  // plugin/src/build.ts:66-77 — the installer entrypoint
  const sourceDir = path.join(packageRoot, "assets", "agents");
  const seats = await renderSeats(sourceDir, register);
  // … fs.mkdir + fs.writeFile for each seat into agentsDir
}
```

The variable `sourceDir` is **hard-coded** to `path.join(packageRoot, "assets", "agents")` — it never reads `docs/`, never reads `plugin/assets/skills/`, never reads `docs/spike/`.

### 1.2 Where those rendered seats are written (installed seat directory)

```ts
// plugin/src/config.ts:31-40
export function resolveAgentsDir(opts: {
  agentDir?: string;
  configDir?: string;
  agentsSubdir?: string;
}): string {
  if (opts.agentDir) return opts.agentDir;
  const configDir = opts.configDir ?? path.join(os.homedir(), ".config", "opencode");
  const subdir = opts.agentsSubdir ?? "agent";
  return path.join(configDir, subdir);           // defaults to ~/.config/opencode/agent
}

// plugin/src/install.ts:90,129
const agentsDir = resolveAgentsDir({ configDir, agentsSubdir: overrides?.agentsSubdir });
// … buildSeatsTo(target.agentsDir, config.register) writes the rendered seats there
// plugin/src/install.ts:140
const seats = await buildSeatsTo(target.agentsDir, config.register);
```

Default installed dir: `~/.config/opencode/agent/` — verified on this machine with `ls ~/.config/opencode/agent/*.md`.

### 1.3 Reconcile-on-load (the 0.2.2 `reconcile` that would auto-install stray assets)

Since `0.2.2` TGO reconciles seats **on every plugin load** (not just `install`). `plugin/src/plugin.ts` resolves the same `assetsAgentsDir` and calls `reconcileSeats`:

```ts
// plugin/src/plugin.ts:125-145 (abbreviated)
const seatDir = resolveAgentsDir({ agentDir: config.agentDir });
void (async () => {
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const assetsAgentsDir = path.join(packageRoot, "assets", "agents");
  const summary = await reconcileSeats(assetsAgentsDir, seatDir, appLog, config.register);
  // summary logs like "seatName (steps 40→100)" and writes .bak for drift
})();
```

`reconcileSeats` source — `plugin/src/seat-sync.ts:11-109`:

```ts
export async function reconcileSeats(
  assetsAgentsDir: string,         // ← plugin/assets/agents
  installedAgentsDir: string,      // ← ~/.config/opencode/agent
  log?: ...,
  register: Register = "concise"
): Promise<string[]> {
  renderedSeats = await renderSeats(assetsAgentsDir, register);
  // for each seat: compare installedContent vs expectedContent
  // if drift: write .bak, then atomic tmp→installPath, push "seatName (steps …)" into summary
}
```

Behavior: any file under `plugin/assets/agents/*.md` is rendered (house-style folded, token-budget asserted) and, if missing or stale in `~/.config/opencode/agent/`, is **installed or overwritten** (with a `.bak`). The reconciliation runs inside the plugin's `TgoPlugin` factory — the host invokes it before any seat is usable.

### 1.4 No other scan paths exist

Grepped `plugin/src/**/*.ts` for any other `readdir`, `readFile` on markdown, or `plugin/assets` references:

- `plugin/src/install.ts` — only reads `plugin/assets/agents` (via `buildSeatsTo`) and `plugin/assets/skills` (via `copySkillBundle`).
- `plugin/src/build.ts` — only `plugin/assets/agents`, `plugin/assets/house-style.md`, `plugin/assets/AGENTS.fragment.md`.
- `plugin/src/validate.ts` — `renderSeats(agentsDir, register)` on the **installed** dir, not `docs/`.
- `plugin/src/presets.ts`, `plugin/src/version.ts`, etc. — no markdown scans.

No code path references `docs/` at all. Search: `grep -rn "docs/spike" plugin/src` → **zero results**.

---

## 2. Where the spike assets actually live

```
docs/spike/fusion/                 ← this directory (worktree-local, never read by plugin)
  SEAT-ASSET.md                    — contains both frontmatter blocks inline (not separate *.md seats)
  ISOLATION.md                     — this file
  MECHANICS.md
  REPORT.md
  frontier-seat-fusion.md          — NOT created as a standalone file (inline block only)
  sidekick-fusion.md               — NOT created as a standalone file (inline block only)
```

Distances:

- Worktree root: `/Users/ryan/opencode/tgo-wt-ylz/` (branch `tgo/ylz-fusion-spike`, `git status` clean before docs).
- Spike dir: `docs/spike/fusion/` — sibling to `docs/ARCHITECTURE.md`, `docs/research/`, `plugin/`.
- Asset source dir: `plugin/assets/agents/` — sibling to `plugin/src/`.
- Installed dir: `~/.config/opencode/agent/` — outside the repo entirely.

```
repo root
├── docs/
│   ├── spike/
│   │   └── fusion/        ← HERE — spike assets (not scanned)
│   └── …
├── plugin/
│   ├── assets/
│   │   └── agents/        ← READ by build.ts / seat-sync.ts (the ONLY read path)
│   └── src/
│       ├── build.ts       ← defines packageRoot + assets/agents
│       ├── seat-sync.ts   ← reconcileSeats
│       ├── install.ts     ← buildSeatsTo
│       ├── plugin.ts      ← load-time reconcile
│       └── config.ts      ← resolveAgentsDir
└── …
```

`docs/spike/fusion/` is **not** `plugin/assets/agents`, not `~/.config/opencode/agent`, and not reachable via `packageRoot + "/assets/agents"`. It is a docs subtree — excluded by every readdir in the pipeline.

Verification commands (run from worktree root):

```bash
# should list ONLY the 8 canonical seats — NOT the spike names
ls plugin/assets/agents/*.md
# → bernstein.md cobain.md dylan.md grohl.md horowitz.md nas.md nirvana.md novoselic.md

# should list the 4 spike docs — NOT under plugin/assets
ls docs/spike/fusion/
# → ISOLATION.md MECHANICS.md REPORT.md SEAT-ASSET.md

# should find no reference to docs/spike inside plugin/src
grep -rn "docs/spike" plugin/src; echo "exit:$?"
# → exit:1 (no matches)
```

---

## 3. What WOULD happen if the assets were placed inside `plugin/assets/agents/` (the danger this isolation prevents)

If the two blocks were written as standalone files under `plugin/assets/agents/frontier-seat-fusion.md` and `plugin/assets/agents/sidekick-fusion.md`:

1. **`buildSeatsTo` (install path) would include them.**
   - `plugin/src/build.ts:56-58` iterates `fs.readdir(sourceDir)`; any `*.md` is read, folded, budget-checked, and pushed into the `seats` array. On `npx tgo install` or `npm run build` the files would be written to `~/.config/opencode/agent/frontier-seat-fusion.md` and `~/.config/opencode/agent/sidekick-fusion.md`, appearing in the opencode seat picker as real seats.

2. **`reconcileSeats` (load path, 0.2.2) would auto-install them even without `install`.**
   - On every opencode start, `plugin/src/plugin.ts:130-131` computes `assetsAgentsDir = path.join(packageRoot, "assets","agents")` and calls `reconcileSeats`. The reconcile loop would `readdir`, render the fusion seats (with `assertPromptUnderBudget`), compare to the installed dir, and — since the installed copies wouldn't exist initially — write them via atomic `tmp→installedPath` and log `frontier-seat-fusion (created)` / `sidekick-fusion (created)`. The next `0.2.2` self-update or plugin restart would overwrite local tweaks and keep the seats installed (with `.bak` backups).

3. **Users would see experimental seats in production.**
   - Bernstein's permission deny + sidekick cheap model are experimental, not reviewed for the default presets. Shipping them as opt-out seats would violate the spike's constraint ("Nothing ships to default presets"; `tgo-ylz` Constraints).

4. **The preset system would NOT automatically activate them, but they would still be selectable.**
   - Presets (`plugin/assets/presets.json` + `plugin/src/presets.ts`) assign models to known seat keys (`bernstein`, `dylan`, etc.). New seat files get no preset mapping by default — they'd inherit opencode's global `model` or run unmapped — but they'd still be **selectable** and **installed**, which is already wrong for an experiment.

5. **Undo requires manual deletion + a patch to stop re-install.**
   - Because `reconcileSeats` re-creates missing seats each load, deleting from `~/.config/opencode/agent/` alone would not stick — the source under `plugin/assets/agents/` would recreate them next load. Only deleting from `plugin/assets/agents/` plus rebuilding (`dist/server.js`) stops the cycle. This is the exact reason the spike keeps assets under `docs/spike/fusion/` where `sourceDir` never points.

---

## 4. Isolation guarantee for this worktree

- **Files committed:** `docs/spike/fusion/*.md` only (plus this proof). No change under `plugin/`, no change to `plugin/assets/agents/`, no change to `plugin/src/**`, no change to the installer's `packageRoot` derivation.
- **Branch isolation:** `tgo/ylz-fusion-spike` is a worktree at `/Users/ryan/opencode/tgo-wt-ylz` (worktree list verified) — not `master`. The commit message is `docs(tgo-ylz): …` with `docs/` prefix, and the diff touches only `docs/spike/fusion/`.
- **Build integrity:** `bunx tsc --noEmit` remains clean because `docs/` is not included in `plugin/tsconfig.json` / root ts compilation. `bun test` covers `plugin/test/**` which only scans `plugin/assets/agents/` via `renderSeats(agentsDir)` where `agentsDir` is the `plugin/assets/agents` constant — docs files never enter the test suite.
- **Installer surface stays 0.2.2:** no new seats in `plugin/assets/agents/`, no change to `plugin/src/build.ts` line 70 (`path.join(packageRoot, "assets","agents")`), no rename. The 0.2.2 `reconcileSeats` behavior is unchanged.

**Conclusion:** `docs/spike/fusion/` is provably outside the asset read path. The danger the isolation prevents — accidental installation and reconciliation of experimental seats into every developer's `~/.config/opencode/agent/` via 0.2.2 — cannot happen from this location.
