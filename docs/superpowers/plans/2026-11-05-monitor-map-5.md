# monitor-map 5.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild monitor-map on `@sjvair/map-sdk` and `@sjvair/sdk` 5.0 as monitor-map 5.0, looking and behaving like 4.3.0 except for the spec's listed fixes and accessibility additions.

**Architecture:** One map-sdk `MapContext` per layout mount, fed by app-wide map-sdk stores (the monitors store doubles as `/core`'s `monitorsManager`). Module-level option state drives which plugins are on the map, in a fixed draw order. Wind and EV chargers are monitor-map's own map-sdk plugins. The options toolbar, search, legend card, load screen, routing and detail panel stay monitor-map components, rewired to map-sdk.

**Tech Stack:** Svelte 5 (runes), sv-router 0.19, `@sjvair/map-sdk` 0.1 (local tarball until published), `@maptiler/sdk` ~4.2.0, `@maptiler/weather`, `@sjvair/sdk` 5.0.0-beta.3, Tailwind v4, Vitest (server, client and a new browser project), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-05-monitor-map-5-design.md` (approved 2026-11-05). Read it before any task; this plan argues from it and does not repeat its reasons.

## Global Constraints

- Parity rule: match monitor-map 4.3.0's look and behavior, except the spec's "Fixes folded in" and map-sdk's fixes and accessibility additions. A difference that fits neither: stop and ask the user (through the session that runs this plan).
- Branches: `release/5.0.0` from `origin/main`. Each PR below is a branch from `release/5.0.0`, in a worktree, PR'd into it. **No merge, push to `main`, tag, GitHub Release or `npm publish` without the user's yes for that specific action.**
- Never modify map-sdk, mobile, sdk-js, sjvair.com or data-dashboard code. A map-sdk gap goes to the coordinator (`data-dashboard-b7`, check `ListAgents`); never work around it with CSS overrides or map-sdk internals.
- Keys: the library never reads `import.meta.env` for keys. Never print, log or commit `VITE_MAPTILER_KEY` or `VITE_NREL_KEY`; never read `.env` into output.
- `@sjvair/sdk`: dev dependency pinned exactly `npm:@jsr/sjvair__sdk@5.0.0-beta.3`; peer `npm:@jsr/sjvair__sdk@^5.0.0-beta.3`.
- `@maptiler/sdk` `~4.2.0` (map-sdk's pin); `npm ls @maptiler/sdk svelte` must show one copy of each.
- `/core` and `/routes` must not reach `@maptiler/sdk`, maplibre, `@maptiler/weather` or uPlot eagerly (`npm run test:bundle`).
- Widget build output names unchanged: `dist/monitor-map/sjvairMonitorMap.js` and `.css`; mount `#SJVAirMonitorMap`; `window.__cdnUrl`; `globalThis.USER`; env names `VITE_MAPTILER_KEY`, `VITE_NREL_KEY`.
- Fixed colors kept from today: inactive `#969696` (map-sdk), collocation crosshair `#4A5FC6`, EV Level 2 `rgb(62,142,208)`/border `rgb(42,114,174)`, Level 3 `rgb(53,73,182)`/border `rgb(42,58,146)`, wind opacity `0.5`.
- Draw order, bottom to top: `wind`, `hms-smoke`, `hms-fire`, `collocation-sites`, `monitors`, `ev-l2`, `ev-l3`.
- Code style per `CLAUDE.md` (tabs, double quotes, no trailing commas, width 100, Tailwind utilities, full `.svelte.js` import extensions, no component and rune module with one base name).
- Before each commit: `npm run format`; before each PR: `npm run check && npm run lint && npm test && npm run test:bundle`.
- No AI attribution anywhere (commits, PRs, docs).
- Local data is incomplete (stack runs ~8 h/day; relaxed monitor health). Rule that out before calling a gap a bug.

## Review Focus

1. **A reading that isn't a usable number** (empty string, `".5"`, negative, no matching level) in the data box, tooltips or chart: shows a number or a neutral color, never `NaN` or a throw. Test in Task 5.
2. **A basemap or theme switch with wind, EV, the search pin or an open EV popup on the map:** every layer comes back, the pin is re-added, globe and space stay. Tests in Tasks 8, 9, 10, 11.
3. **Mobile's order of calls:** `monitorsManager.init(undefined, { autoUpdate: false })` long before the map mounts, then the map mounts, unmounts (tab switch) and mounts again: one store, no refetch of meta or list, polling starts on mount and pauses on unmount, option choices survive. Tests in Tasks 3 and 7.
4. **`?pollutant=` values** missing, unknown (`?pollutant=co`), `none`, or changed by the back button, including a deep link to `/monitor/:id?pollutant=none`: the map follows the URL, the panel still loads. Test in Task 7.
5. **NREL or HMS failing or empty** (bad key, network error, a day with no fires): that layer is empty, nothing throws, the rest of the map works. Tests in Tasks 9 and 11.

---

## PR 1: setup (Tasks 1–2)

### Task 1: Release branch, license, release workflow, map-sdk packing

**Files:**
- Create: `LICENSE`, `scripts/pack-map-sdk.sh`
- Modify: `package.json`, `.gitignore`, `.github/workflows/release-package.yml`, `CLAUDE.md` (Environment Variables)

**Interfaces:**
- Produces: `npm run map-sdk:pack` (builds `../map-sdk`, packs it into `vendor/`, reinstalls); `vendor/` ignored by git.

- [ ] **Step 1: Ask the user before pushing `release/5.0.0`.** It is a new remote branch identical to `origin/main`. With their yes: `git fetch origin && git push origin "origin/main:refs/heads/release/5.0.0"`. Then create this PR's worktree from it.
- [ ] **Step 2: Add `LICENSE`** (MIT, `Copyright (c) 2026 Central California Asthma Collaborative (SJVAir)`, same text as `../map-sdk/LICENSE`) and `"license": "MIT"` in `package.json`. Set `"version": "5.0.0-dev.0"`.
- [ ] **Step 3: Release workflow.** In `release-package.yml`: publish step becomes `npm publish --access public --provenance $TAG` where a prior step sets `TAG=--tag next` when `package.json`'s version contains `-` (copy map-sdk's `.github/workflows/release.yml` logic). Remove `VITE_OPENWEATHERMAP_KEY` from `env:`; remove it from `CLAUDE.md`'s env list.
- [ ] **Step 4: `scripts/pack-map-sdk.sh`**: `set -euo pipefail`; `npm --prefix ../map-sdk run build`; `mkdir -p vendor`; `npm pack ../map-sdk --pack-destination vendor`; print the tarball name. Add `"map-sdk:pack": "bash scripts/pack-map-sdk.sh"` to scripts and `vendor/` to `.gitignore`.
- [ ] **Step 5: Verify:** `npm run map-sdk:pack` prints `vendor/sjvair-map-sdk-0.1.0-dev.0.tgz`; `npm test` passes unchanged.
- [ ] **Step 6: Commit** `chore: MIT license, prerelease tag, map-sdk packing script`.

### Task 2: Keys as injected config

**Files:**
- Create: `src/lib/config.svelte.ts`, `tests/config.test.ts`
- Modify: `src/lib/map/map-manager.svelte.ts:11`, `src/lib/ev-stations/ev-stations.svelte.ts:41`, `src/App.svelte`, `src/lib/core.ts`, `src/lib/index.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface MonitorMapConfig { maptilerKey: string; nrelKey: string }
  export function configureMonitorMap(config: MonitorMapConfig): void
  export function monitorMapConfig(): MonitorMapConfig // throws Error("monitor-map: call configureMonitorMap() first") before configure
  ```
  Exported from `.` and `./core`.

- [ ] **Step 1: Failing tests** in `tests/config.test.ts` (re-import the module per test with `vi.resetModules()`):
  ```ts
  it("throws before configureMonitorMap", async () => {
  	const { monitorMapConfig } = await import("$lib/config.svelte");
  	expect(() => monitorMapConfig()).toThrow("call configureMonitorMap() first");
  });
  it("returns what was configured", async () => {
  	const m = await import("$lib/config.svelte");
  	m.configureMonitorMap({ maptilerKey: "a", nrelKey: "b" });
  	expect(m.monitorMapConfig()).toEqual({ maptilerKey: "a", nrelKey: "b" });
  });
  ```
- [ ] **Step 2:** `npx vitest run tests/config.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement**, then replace the two `import.meta.env.VITE_*` reads with `monitorMapConfig().maptilerKey` / `.nrelKey` (read at use time, not module load). `src/App.svelte` calls `configureMonitorMap({ maptilerKey: import.meta.env.VITE_MAPTILER_KEY ?? "", nrelKey: import.meta.env.VITE_NREL_KEY ?? "" })` before `provideMonitorMapRouter`.
- [ ] **Step 4:** `npx vitest run tests/config.test.ts` → PASS; `grep -rn "import.meta.env.VITE" src/lib` → no output.
- [ ] **Step 5:** `npm run dev`, load the map and EV layer once on the local stack to confirm keys still arrive (don't print them). Commit `feat: hosts pass the MapTiler and NREL keys in`.
- [ ] **Step 6: Open PR 1** into `release/5.0.0` with the spec and this plan included (cherry-pick `docs/5.0-design`'s commits). Tell the coordinator the PR is open. Merge only with the user's yes.

## PR 2: the foundation (Task 3)

### Task 3: Move to SDK 5.0 and map-sdk; replace the old map stack

The old integration system can't type-check against SDK 5.0, so this one task swaps the foundation: deps, the `/core` wrapper, scale-based levels in the panel, and a map showing monitors only. Later tasks add the rest back.

**Files:**
- Modify: `package.json` (deps below), `src/lib/monitors/monitors.svelte.ts` (rewrite), `src/lib/core.ts`, `src/lib/index.ts`, `src/lib/map/MapShell.svelte`, `src/lib/MonitorMapLayout.svelte`, `src/lib/MonitorDetailPanel.svelte`, `src/lib/components/DataBox.svelte`, `src/lib/data-chart/level-colors.ts`, `src/lib/data-chart/DataChart.svelte`, `src/lib/monitors/components/MonitorSubscriptionManager.svelte`, `src/lib/search/service.ts`, `src/lib/monitors/types.ts`, `src/lib/monitors/monitor-utils.ts`
- Create: `src/lib/map/live-map.svelte.ts`, `src/lib/stores.svelte.ts`, `src/lib/levels.ts`, `tests/monitors/monitors-manager.test.ts` (rewrite), `tests/levels.test.ts`
- Delete: `src/lib/map/{map-manager.svelte.ts,Map.svelte,map-style-state.svelte.ts,icons.ts}`, `src/lib/map/integrations/**`, `src/lib/monitors/{monitors-map-integration.svelte.ts,monitors-icon-manager.svelte.ts,monitors-cluster-renderer.ts}`, `src/lib/monitors/components/{MonitorTooltip,MonitorClusterTooltip}.svelte`, `src/lib/collocation-sites/**`, `src/lib/hms/**`, `src/lib/wind/wind.svelte.ts`, `src/lib/ev-stations/{ev-stations-map-integration.svelte.ts,ev-stations-cluster-renderer.ts,components/EvStationClusterTooltip.svelte}`, `src/lib/legend/{LegendBar.svelte,legend-data.ts}`, `src/lib/shared-load.ts`, `src/lib/reactivity.svelte.ts` if unused, and their tests (`tests/map/**`, `tests/legend/legend-data.test.ts`, `tests/managers-signal.test.ts`, `tests/shared-load.test.ts`, `tests/client/monitors-manager-refetch.test.ts`, `tests/monitors/monitor-utils.test.ts` if its module goes)

**Interfaces:**
- Consumes: `monitorMapConfig()` (Task 2).
- Produces:
  ```ts
  // src/lib/stores.svelte.ts — app-wide, created once (light: imports only @sjvair/map-sdk/stores)
  export const monitorsStore: MonitorsStore            // createMonitorsStore()
  // src/lib/monitors/monitors.svelte.ts
  export interface MonitorsInitOptions { autoUpdate?: boolean; signal?: AbortSignal }
  export interface MonitorsManager {
  	init(pollutant?: unknown, options?: MonitorsInitOptions): Promise<void>; // only "pm25" | "o3" pass through; anything else → undefined
  	readonly initialized: boolean;
  	readonly meta: MonitorsMeta | null;
  	readonly list: MonitorData[] | null;        // null until initialized
  	readonly pollutant: string | null;          // store.entryType
  	setPollutant(pollutant: "pm25" | "o3"): void; // store.entryTypeFor
  	update(options?: { signal?: AbortSignal }): Promise<void>;
  	resumeAutoUpdate(): void;
  	pauseAutoUpdate(): void;
  	readonly store: MonitorsStore;
  }
  export function createMonitorsManager(store: MonitorsStore): MonitorsManager
  export const monitorsManager: MonitorsManager // createMonitorsManager(monitorsStore)
  // src/lib/levels.ts
  export function readingLevel(value: string | number | null | undefined, scale: Scale | null): Level | null // map-sdk levelFor; NO_LEVEL or null scale → null
  export const NEUTRAL_LEVEL_COLOR = "#969696"
  // src/lib/map/live-map.svelte.ts
  export function createLiveMap(): MapContext // createMap with the spec's config: center [-119.7987626619462, 36.76272050981146], zoom 7, bearing 0, pitch 0, projection "globe", space { preset: "milkyway" }, basemaps { ...defaultBasemaps(), excludedLayers: [] } (Task 8 replaces the basemap list), maptilerKey from monitorMapConfig()
  ```

- [ ] **Step 1: Deps.** `npm run map-sdk:pack`; then in `package.json`: `"@sjvair/map-sdk": "file:vendor/sjvair-map-sdk-0.1.0-dev.0.tgz"` (dependencies), `"@maptiler/sdk": "~4.2.0"`, `@sjvair/sdk` moved to `peerDependencies` (`npm:@jsr/sjvair__sdk@^5.0.0-beta.3`) and `devDependencies` (`npm:@jsr/sjvair__sdk@5.0.0-beta.3`). `npm install`. Verify `npm ls @maptiler/sdk svelte @sjvair/sdk` shows a single copy of each; if not, stop and report.
- [ ] **Step 2: Failing tests for the wrapper** in `tests/monitors/monitors-manager.test.ts`, against a fake `MonitorsStore` (an object with `$state` fields `initialized`, `entryType`, `meta`, `monitors: Map`, and `vi.fn()` for `init`, `entryTypeFor`, `update`, `pauseAutoUpdate`, `resumeAutoUpdate`):
  - `list` is `null` while `store.initialized` is false, and `[...store.monitors.values()]` after.
  - `init("pm25", { autoUpdate: false })` calls `store.init("pm25", { autoUpdate: false })`.
  - `init("none")`, `init(true)`, `init(7)`, `init(undefined)` each call `store.init(undefined, …)`.
  - `setPollutant("o3")` calls `store.entryTypeFor("o3")`; `pollutant` reads `store.entryType`.
- [ ] **Step 3:** `npx vitest run tests/monitors/monitors-manager.test.ts` → FAIL.
- [ ] **Step 4: Implement** `stores.svelte.ts` and the wrapper (getters over the store; no state of its own).
- [ ] **Step 5:** Wrapper tests → PASS.
- [ ] **Step 6: Failing tests for `readingLevel`** in `tests/levels.test.ts` with a two-level range scale `{ kind: "range", levels: [{ key: "good", min: 0, max: 9, color: "#00e400", … }, { key: "moderate", min: 9, max: null, color: "#ffff00", … }] }`: `readingLevel("4.9", s)?.key === "good"`; `readingLevel(9, s)?.key === "moderate"` (half-open); `readingLevel(-1, s) === null`; `readingLevel("", s) === null`; `readingLevel(5, null) === null`.
- [ ] **Step 7:** Run → FAIL; implement; run → PASS.
- [ ] **Step 8: Delete the old stack** (list above) and its tests. Rewrite `core.ts` to export the router context, `monitorsManager`, `MonitorsManager`, `MonitorsInitOptions`, `configureMonitorMap`, `monitorMapConfig`, `MonitorMapConfig`. Rewrite `index.ts` to those plus `monitorMapRoutes`. Remove `MonitorsDataSource`/`MonitorsPollutant` exports.
- [ ] **Step 9: Scale everywhere levels were read.** Panel and `DataBox`: color from `readingLevel(value, meta.entryType(p).scale)?.color ?? NEUTRAL_LEVEL_COLOR`. `level-colors.ts`: take `Scale` and build the chart gradient stops from each level's `min`/`color` (keep the final black stop); update `tests/data-chart/level-colors.test.ts` to scale input with the same expected stops. `MonitorSubscriptionManager`: the four rows come from `meta.entryType("pm25").scale.levels` filtered to keys `unhealthy_sensitive`, `unhealthy`, `very_unhealthy`, `hazardous`, in that order, skipping missing keys; label and color from the level. Search's monitor results read `monitorsStore.monitors` filtered to ids in `monitorsStore.latest` with a non-null value.
- [ ] **Step 10: Minimal live map.** `MapShell` keeps the load screen, the panel slide and the router escape hatch, drops `integrations`/`Map.svelte`, and renders `<MapView map={…} label="Air quality monitor map" controls="engine" selectionBar={false} tooltip="pointer" />` in its map slot. `MonitorMapLayout` creates the map with `createLiveMap()` on mount and `map.destroy()` on destroy; adds `monitorsPlugin({ id: "monitors", source: monitorsStore.dataSource, layerLabel: "Monitors", selectable: true, selectedStyle: "enlarge" })` with `{ selectionMode: "single" }`; on `featureclick` for `pluginId === "monitors"` navigates to `${basePath}/monitor/:id` and calls `map.easeTo({ center: lngLat, minZoom: 12 })`; sets the selection from the route id and clears it when the panel closes; drops the panel's `map.resize()`. Keep `init(route.search.pollutant)`, `resumeAutoUpdate()` on mount and `pauseAutoUpdate()` on destroy. The options bar, legend and other layers are left out until their tasks.
- [ ] **Step 11:** `npm run check && npm run lint && npm test && npm run test:bundle` → all pass. `npm run dev` on the local stack: monitors draw in level colors with clusters; a click opens the panel and eases in; the panel shows the data box, chart and subscription rows with colors.
- [ ] **Step 12: Commit** `feat!: rebuild the map on map-sdk and @sjvair/sdk 5.0`; open PR 2; tell the coordinator.

## PR 3: the detail panel (Tasks 4–6)

### Task 4: Browser test project

**Files:**
- Modify: `vitest.config.ts`, `package.json` (devDeps `@vitest/browser`, `vitest-browser-svelte`, `playwright`, versions as map-sdk's `package.json`)
- Create: `tests/browser/smoke.test.ts`

**Interfaces:**
- Produces: a third Vitest project `browser` (`tests/browser/**`, headless Chromium, Svelte compiled for the client), copied from `../map-sdk/vitest.config.ts`; `npm test` runs all three.

- [ ] **Step 1:** Add the project and a smoke test that renders `DataBox` with `{ value: 12, color: "#00e400", label: "PM2.5" }` and expects text `12`.
- [ ] **Step 2:** `npx vitest run --project browser` → PASS. Commit `test: browser project for component specs`.

### Task 5: Panel and chart fixes

**Files:**
- Modify: `src/lib/data-chart/DateRange.ts`, `src/lib/data-chart/DataChart.svelte`, `src/lib/MonitorDetailPanel.svelte`, `src/lib/components/DataBox.svelte`
- Test: `tests/data-chart/date-range.test.ts`, `tests/browser/data-box.test.ts`, `tests/browser/data-chart.test.ts`, `tests/browser/monitor-detail-panel.test.ts`

**Interfaces:**
- Produces (`DateRange.ts`, same names as today):
  ```ts
  export type DateRange = { start: string; end: string } // ISO instants
  export function createDateRange(start?: DateValue, end?: DateValue, now?: Date): DateRange
  export function includesToday(range: DateRange, now?: Date): boolean
  export function extendToNow(range: DateRange, now?: Date): DateRange
  export function readingDisplay(value: string | number | null | undefined): string // Math.trunc(Number(value)) as text; "–" when not finite
  ```
  (`readingDisplay` lives in `src/lib/levels.ts`.)

- [ ] **Step 1: Failing date tests** with `process.env.TZ = "America/New_York"` set before importing, `now = new Date("2026-11-05T03:30:00Z")` (Nov 4, 19:30 Pacific):
  - `createDateRange(undefined, undefined, now)` → `{ start: "2026-11-03T07:00:00.000Z", end: now.toISOString() }` (start of yesterday, Pacific).
  - `createDateRange(new CalendarDate(2026, 11, 1), new CalendarDate(2026, 11, 2), now)` → start `"2026-11-01T07:00:00.000Z"`, end = `endOfPacificDay` of Nov 2 (`"2026-11-03T07:59:59.999Z"`).
  - picked end day = Pacific today (`CalendarDate(2026, 11, 4)`) → end is `now`.
  - `includesToday({ start, end: "2026-11-05T02:00:00Z" }, now)` → true (Nov 4 Pacific); with end `"2026-11-04T06:00:00Z"` → false.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement with `startOfPacificDay`, `endOfPacificDay`, `addPacificDays` from `@sjvair/sdk` (a `DateValue` y/m/d maps to `startOfPacificDay(new Date(Date.UTC(y, m - 1, d, 12)))`); drop `date-fns` here. Run → PASS.
- [ ] **Step 4: Failing component tests:**
  - `data-box.test.ts`: `readingDisplay(".5") === "0"`, `readingDisplay("4.93") === "4"`, `readingDisplay("") === "–"`; DataBox with `color: ""` renders without throwing and uses `NEUTRAL_LEVEL_COLOR`.
  - `data-chart.test.ts` (mock `fetchChartData`): (a) a range change starts loading, a `refreshTick` bump supersedes it and its request rejects → the "↻ Loading Data" overlay is gone; (b) the title reads `"PM2.5 Readings"` from a meta whose `entryType("pm25").label` is `"PM2.5"`; (c) re-rendering with a new `monitor` object of the same `id` and `type` does not call uPlot's constructor again (spy on the module's chart constructor).
  - `monitor-detail-panel.test.ts` (mock `getMonitorDetails` and the temperature fetch in `src/lib/weather.ts`): an inactive monitor shows "This monitor has no current readings.", no "Get the widget!" button, and still the temperature box and (with `globalThis.USER = { is_authenticated: true, api_token: "t" }`) the subscribe button; an active one shows the widget button on a tall viewport.
- [ ] **Step 5:** Run → FAIL. **Step 6:** Implement: the silent refresh sets `chartManager.loading = false` when it supersedes a load (success or failure); the rebuild effect tracks a `$derived` monitor type plus `colors` and `pollutantLabel` explicitly; labels from `meta.entryType(pollutant).label`; DataBox neutral fallback; widget button hidden when the panel has no current reading. Run → PASS.
- [ ] **Step 7:** Commit `fix: Pacific chart days, chart loading, data box and panel fixes`. Remove the matching items from `CLAUDE.md` "Known issues" in the same commit.

### Task 6: Subscription status errors

**Files:**
- Modify: `src/lib/monitors/components/MonitorSubscriptionManager.svelte`
- Test: `tests/browser/subscription-manager.test.ts`

- [ ] **Step 1: Failing test:** with `loadSubscriptionLevel` mocked to reject `new Error("500")`, the component shows `"Couldn't load your alert settings."` and a "Try again" button (role button), no unhandled rejection (`window.addEventListener("unhandledrejection", spy)`; spy not called); clicking Try again with the mock now resolving `"unhealthy"` shows "Manage Subscription". An aborted load (unmount mid-request) shows nothing and logs nothing.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement with the panel's `LoadError` component styling. Run → PASS.
- [ ] **Step 4:** Commit `fix: show subscription status load errors`; open PR 3; tell the coordinator.
- [ ] **Step 5: After PR 3 merges** (user's yes), in the data-dashboard docs worktree: move "monitor-map: chart stuck loading…" and "monitor-map: subscription status load errors…" from `DEFERRED.md` to `TODO.md` → Done, push to its `main` (fetch, rebase, prettier first).

## PR 4: options, layers and the legend (Tasks 7–9)

### Task 7: Option state, monitor filters, plugin sync and the pollutant URL

**Files:**
- Create: `src/lib/options/map-options.svelte.ts`, `src/lib/options/plugin-order.ts`, `src/lib/monitors/filtered-source.svelte.ts`, `src/lib/map/sync-plugins.svelte.ts`
- Modify: `src/lib/options/map-option-defaults.ts`, `src/lib/options/reset-map-options.ts`, `src/lib/options/pollutant-param.ts`, `src/lib/options/menus/{PollutantMenu,MonitorsMenu,LayersMenu,OverlaysMenu,SettingsMenu}.svelte`, `src/lib/MonitorMapLayout.svelte`
- Test: `tests/options/plugin-order.test.ts`, `tests/monitors/filtered-source.test.ts`, `tests/options/map-option-defaults.test.ts`, `tests/options/pollutant-param.test.ts`, `tests/client/sync-plugins.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // map-options.svelte.ts — module-level, survives layout remounts
  export const mapOptions: {
  	monitorsOn: boolean;                                   // false for "None"
  	monitorTypes: Record<string, boolean>;                 // keys as MAP_OPTION_DEFAULTS.monitorTypes
  	inactive: boolean; inside: boolean; clustered: boolean;
  	collocationSites: boolean; fireAndSmoke: boolean;
  	evStations: boolean; evLevels: { lvl2: boolean; lvl3: boolean };
  	wind: boolean;
  }
  export function resetMapOptions(defaultPollutant: "pm25" | "o3" | null): void // MAP_OPTION_DEFAULTS, monitorsOn true, pollutant via monitorsManager.setPollutant, basemap reset (Task 8 hook)
  // plugin-order.ts
  export const DRAW_ORDER = ["wind", "hms-smoke", "hms-fire", "collocation-sites", "monitors", "ev-l2", "ev-l3"] as const
  export type PluginKey = (typeof DRAW_ORDER)[number]
  export function beforeId(key: PluginKey, present: ReadonlySet<string>): string | undefined // first present key above `key`
  export function wantedPlugins(o: typeof mapOptions, pollutant: string | null): Set<PluginKey>
  // filtered-source.svelte.ts
  export function filteredMonitors(source: DataSource<MonitorFeatureProperties>, options: typeof mapOptions): DataSource<MonitorFeatureProperties>
  // sync-plugins.svelte.ts
  export type PluginFactories = Partial<Record<PluginKey, () => MapPlugin>> // a wanted key with no factory yet is skipped
  export function syncPlugins(map: MapContext, wanted: () => Set<PluginKey>, factories: PluginFactories, deps?: () => unknown): void // inside an $effect: adds missing (fresh plugin, before beforeId), removes unwanted; `deps` lists reads that must rebuild a present plugin (e.g. `clustered`)
  ```

- [ ] **Step 1: Failing pure tests:**
  - `beforeId("hms-smoke", new Set(["monitors", "wind"])) === "monitors"`; `beforeId("ev-l3", new Set(["monitors"])) === undefined`.
  - `wantedPlugins`: defaults + `"pm25"` → `{hms-smoke, hms-fire, monitors}`; `collocationSites: true` + `"o3"` → no `collocation-sites`; `collocationSites: true, monitorsOn: false` + `"pm25"` → no `collocation-sites`, no `monitors`; `evStations: true, evLevels: { lvl2: true, lvl3: false }` → `ev-l2` only; `fireAndSmoke: false` → neither HMS key.
  - `filteredMonitors`: features of types `purpleair` (active, outside), `airnow` (inactive), `purpleair` (inside) with defaults → only the first; `inactive: true` → first two; `monitorTypes.purpleair = false` → none of the purpleair; `status` and `scale` pass through unchanged.
  - `map-option-defaults.test.ts`: `resetMapOptions("pm25")` restores every field of `MAP_OPTION_DEFAULTS`, sets `monitorsOn` true and calls `setPollutant("pm25")`.
  - `pollutant-param.test.ts`: keep today's `parsePollutantParam` cases (`"pm25"`, `"o3"`, `"none"`, `"co"` → null, missing → null).
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. Run → PASS.
- [ ] **Step 4: Failing client test** `tests/client/sync-plugins.test.ts` with a fake `MapContext` (records `addPlugin(plugin, { before })`/`removePlugin(id)` calls, `plugins` as `$state`): turning `wind` on after `monitors` adds `wind` with `before: "monitors"`; turning it off removes it; flipping `clustered` with `deps` reading it removes and re-adds `monitors` (a fresh plugin object, not the same one); a layout "remount" (new fake map, same `mapOptions`) adds the same set.
- [ ] **Step 5:** Run → FAIL. **Step 6:** Implement; wire in `MonitorMapLayout`: factories for `monitors` (`monitorsPlugin` over `filteredMonitors(monitorsStore.dataSource, mapOptions)`, `clustered: mapOptions.clustered`, `selectedStyle: "enlarge"`), `hms-smoke`, `hms-fire`, `collocation-sites` (Task 9 adds their stores), with selection mode `"single"` re-passed on each monitors add. Rewire the five menus to `mapOptions` and `monitorsManager` (rows, groups, defaults and copy unchanged; row icons from map-sdk's `circle`/`triangle`/`withCrosshair`). Pollutant URL sync keeps today's two effects (URL→state untracked, state→URL via `searchParams.set`), with `currentSelection(monitorsManager.pollutant, mapOptions.monitorsOn)`. Run → PASS.
- [ ] **Step 7: Browser check** on the local stack: each menu row toggles its layer; `?pollutant=none`, `?pollutant=o3`, `?pollutant=co` and back/forward behave as today; a deep link `/monitor/<id>?pollutant=none` opens the panel. Commit `feat: options drive map-sdk plugins`.

### Task 8: Basemaps, themes and Settings

**Files:**
- Create: `src/lib/map/basemaps.ts`, `tests/map/basemaps.test.ts`
- Modify: `src/lib/map/live-map.svelte.ts`, `src/lib/options/menus/SettingsMenu.svelte`, `src/lib/options/map-options.svelte.ts` (reset hook)
- Delete: `src/lib/map/basemap.ts`, `src/lib/map/utils.ts` (after moving `MAP_STYLE_OPTIONS` logic)

**Interfaces:**
- Produces:
  ```ts
  export function monitorMapBasemaps(): BasemapConfig // every MapStyle, highest _V<n> per base name, sorted by getName(); styles = each style's variants as { id: variant.getId(), style: variant.getExpandedStyleURL() }; defaultId = STREETS_V4 default variant; excludedLayers: []
  export function basemapChoices(): Array<{ name: string; variants: Array<{ id: string; type: string }> }> // for the Basemap select and Theme radios
  export function switchBasemap(currentId: string, toBaseName: string): string // the new basemap's variant of the same type if it has one, else its default — today's src/lib/map/basemap.ts rule
  ```

- [ ] **Step 1: Failing tests:** `monitorMapBasemaps().defaultId === MapStyle.STREETS_V4.getDefaultVariant().getId()`; `excludedLayers` is `[]`; no two styles share an id; `basemapChoices()` names are sorted and contain no `_V<n>` duplicates (e.g. only one "Streets"); `switchBasemap(<streets dark id>, "Basic")` returns Basic's dark variant id; a target without that type returns its default id. Port today's `tests/map/basemap.test.ts` cases.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement; Settings menu calls `map.basemap.select(id)` and reads `map.basemap.current` (so a failed style reverts the selection, as map-sdk does). Reset calls `map.basemap.select(defaultId)`. Run → PASS.
- [ ] **Step 4: Check globe and space across a switch** in the browser (`map.gl.getProjection()` is globe and the space background is visible after Streets → Satellite → Streets). If either is lost, stop: report to the coordinator as a map-sdk gap; don't work around it. Commit `feat: basemap and theme menus on map-sdk`.

### Task 9: HMS, collocation sites and the legend card

**Files:**
- Modify: `src/lib/stores.svelte.ts`, `src/lib/MonitorMapLayout.svelte`, `src/lib/legend/Legend.svelte`
- Test: `tests/browser/legend-card.test.ts`

**Interfaces:**
- Produces (`stores.svelte.ts`): `export const hmsSmokeStore = createHmsSmokeStore()`, `hmsFireStore = createHmsFireStore()`, `collocationSitesStore = createCollocationSitesStore({ monitors: monitorsStore })`. The layout calls each `init()` once on mount (rejections caught and logged; the layer just stays empty). Factories: `hmsSmokePlugin({ id: "hms-smoke", source: hmsSmokeStore.dataSource, layerLabel: "Smoke" })`, `hmsFirePlugin({ id: "hms-fire", source: hmsFireStore.groups, hotspots: hmsFireStore.hotspots, layerLabel: "Fires" })`, `collocationSitesPlugin({ id: "collocation-sites", source: collocationSitesStore.dataSource, layerLabel: "Collocation sites" })`.
- `Legend.svelte` becomes the folding card (today's header, `w-84`, bottom-left, expanded by default, collapsed state kept) around `<Legend map={map} order="top-first" />` from map-sdk; hidden when map-sdk's legend has no sections.

- [ ] **Step 1: Failing test** `legend-card.test.ts`: with a fake map whose plugins give one legend section, the card shows "Legend" with `aria-expanded="true"`; clicking the header collapses it; with no sections the card isn't rendered.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. Run → PASS.
- [ ] **Step 4: Browser check:** fire groups below zoom 10, hotspots from 10; smoke plume outlines; collocation crosshairs only with PM2.5 and monitors on, winning the hover; legend order pollutant, fire, smoke; with HMS mocked to fail (`page.route` in Playwright, or devtools offline for `hms/`), the map still loads and no error reaches the console unhandled. Commit `feat: HMS, collocation sites and the legend card`; open PR 4; tell the coordinator.

## PR 5: wind, EV chargers and search (Tasks 10–12)

### Task 10: Wind plugin

**Files:**
- Create: `src/lib/wind/wind-plugin.ts`, `tests/client/wind-plugin.test.ts`
- Modify: `src/lib/MonitorMapLayout.svelte` (factory `wind`)

**Interfaces:**
- Produces: `export function windPlugin(options?: { createLayer?: (id: string) => CustomLayerInterface }): MapPlugin` — `id: "wind"`, `label: "Wind"`, no legend, not selectable; `setup(ctx)` calls `ctx.addCustomLayer("wind", createLayer)` where the default `createLayer` is `(id) => new WindLayer({ id, opacity: 0.5 })` from `@maptiler/weather`. `@maptiler/weather` is imported only by this module (reached only through the layout chunk).

- [ ] **Step 1: Failing test** with a fake `PluginContext` and a stub `createLayer`: `setup` calls `addCustomLayer` once with local id `"wind"`; calling `setup` again (a restyle) calls `createLayer` again, returning a new object.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. Run → PASS.
- [ ] **Step 4: Browser check:** wind draws under smoke and monitors; survives a basemap switch; `npm run test:bundle` still passes. Commit `feat: wind as a map-sdk custom layer`.

### Task 11: EV chargers

**Files:**
- Create: `src/lib/ev-stations/ev-plugin.svelte.ts`, `src/lib/ev-stations/ev-store.svelte.ts`, `src/lib/ev-stations/EvPopup.svelte` (from `EvStationTooltip.svelte`), `scripts/check-ev-zips.mjs`, `tests/ev-stations/zip-codes.test.ts`, `tests/ev-stations/ev-store.test.ts`
- Modify: `src/lib/ev-stations/zip-codes.ts`, `src/lib/ev-stations/ev-stations.svelte.ts` (fetch only), `src/lib/MonitorMapLayout.svelte`
- Delete: `src/lib/ev-stations/ev-station-icons.ts` if replaced

**Interfaces:**
- Produces:
  ```ts
  // zip-codes.ts keeps the per-county exports and adds
  export const EV_ZIP_CODES: readonly string[] // union of all counties, deduped, sorted
  // ev-store.svelte.ts
  export type EvLevel = "lvl2" | "lvl3"
  export function createEvStore(fetchStations?: (level: EvLevel, signal?: AbortSignal) => Promise<EvStation[]>): {
  	dataSource(level: EvLevel): DataSource<EvFeatureProperties>; // status "loading" until first load(level)
  	load(level: EvLevel): Promise<void>;                          // once per level; a failure sets status error with retry, features null
  	station(id: string): EvStation | undefined;
  }
  export interface EvFeatureProperties extends MapFeatureProperties { level: EvLevel }
  // ev-plugin.svelte.ts
  export function evPlugin(level: EvLevel, source: DataSource<EvFeatureProperties>, options: { clustered: boolean }): MapPlugin // id "ev-l2" | "ev-l3"
  ```
  The layout wires `featureclick` for `ev-l2`/`ev-l3` (and list picks) to open `EvPopup` in a MapTiler `Popup` through `maptilerMap(map)` (one open at a time, closed on a basemap switch or when the plugin is removed).

- [ ] **Step 1: ZIP check script** `scripts/check-ev-zips.mjs`: downloads the Census 2020 ZCTA-to-county relationship file (`https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt`) into the scratch dir, and for each county list in `zip-codes.ts` prints ZIPs not in that county per Census (by county FIPS: San Joaquin 06077, Stanislaus 06099, Merced 06047, Madera 06039, Fresno 06019, Kings 06031, Tulare 06107, Kern 06029, Calaveras 06009, Tuolumne 06109, Mono 06051, Mariposa 06043, Inyo 06027), and in-county ZCTAs missing from the list. Run it; fix misfiled ZIPs (93541 out of Tuolumne at least). **Ask the user before adding missing ZIPs** (it changes which chargers show); list any additions for the comparison page.
- [ ] **Step 2: Failing tests:** `EV_ZIP_CODES` has no duplicates and includes `"93631"` once; `Tuolumne` doesn't include `"93541"`; `Mono` does. `ev-store`: `load("lvl2")` twice calls `fetchStations` once; a rejecting fetch leaves `dataSource("lvl2").status.state === "error"` and `features === null`, and `retry()` fetches again; station `226154` is dropped; features carry `refKey`, `name` (station name), `value: null`, `level`.
- [ ] **Step 3:** Run → FAIL. **Step 4:** Implement: the fetch takes the key from `monitorMapConfig().nrelKey` and `zip=EV_ZIP_CODES.join(",")` (domain `developer.nlr.gov`, other params as today). `evPlugin` on map-sdk's `pointsPlugin` (32px icon: today's circle with the white charger glyph in the level's colors; clusters radius 40, max zoom 9, circles at 0.6 alpha with radius 15/20 (≥10)/25 (≥25) and a white 12px count; cluster hover tooltip "Level 2 Chargers"/"Level 3 Chargers" and "N stations"; cluster click eases to the expansion zoom; `features()` returns the stations in view for the feature list). If `pointsPlugin` can't express a part of this, build that part with `PluginContext` layers in the same plugin and note it in the PR; if map-sdk lacks something needed, report it. The layout calls `load(level)` when the level is first wanted. Run → PASS.
- [ ] **Step 5: Browser check:** both levels draw, cluster and uncluster with Marker Clusters; clicking a station or picking it from the List opens today's popup; the popup closes on a basemap switch and the layer comes back; with NREL blocked the map still works. Commit `feat: EV chargers as a map-sdk plugin; clean the ZIP list`.

### Task 12: Search on map-sdk

**Files:**
- Modify: `src/lib/search/Search.svelte`, `src/lib/search/service.ts`
- Test: `tests/search/service.test.ts`, `tests/client/search-pin.test.ts`

**Interfaces:**
- Consumes: the layout's `MapContext` (passed as a prop `map`), `maptilerMap`, `monitorsStore`.
- Produces: `searchMonitors(query: string, monitors: Iterable<MonitorData>, latest: ReadonlyMap<string, { value: number | null }>): MonitorData[]` (exact, prefix, substring, case-insensitive, max 4, only ids with a non-null latest value); `geocode(query, proximity, key)` as today with `key` from `monitorMapConfig().maptilerKey`.

- [ ] **Step 1: Failing tests:** `searchMonitors("fresno", …)` orders an exact name before a prefix before a substring, caps at 4, skips a monitor with `value: null`. `search-pin`: with a fake map whose `gl` changes from A to B, a placed pin is added to A, then removed from A and added to B; clearing the search removes it.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement: monitor result → `map.flyTo({ center, zoom: 12 })` then navigate; address → `flyTo({ center, zoom: 16 })`, other places `flyTo({ center })`; the pin is a `Marker` from `@maptiler/sdk` added in an `$effect` on `maptilerMap(map)`. Run → PASS.
- [ ] **Step 4:** Commit `feat: search on map-sdk camera moves`; open PR 5; tell the coordinator.

## PR 6: shell, look and packaging (Tasks 13–14)

### Task 13: Load screen, theme tokens and the List button

**Files:**
- Modify: `src/lib/map/MapShell.svelte`, `src/app.css`, `src/lib/MonitorMapLayout.svelte`, `vite.config.ts` (only if the scope plugin needs map-sdk's CSS included)

- [ ] **Step 1:** The load screen hides when `map.ready && monitorsManager.initialized`; the failure line and Try again call `monitorsStore.dataSource.status.retry()` when its state is `"error"`.
- [ ] **Step 2:** `src/app.css` imports `@sjvair/map-sdk/theme.css`, adds `@source "../node_modules/@sjvair/map-sdk/dist";`, and defines map-sdk's required tokens (light values matching today's shadcn palette already in `app.css`; no dark block applied). Check the built CSS is still wrapped in `@scope (#SJVAirMonitorMap)` and tokens resolve inside it.
- [ ] **Step 3: List button:** **blocked until map-sdk ships the corner and show-on-focus options** (asked through the coordinator 2026-11-05). Then pass them for top right under the engine controls, shown on keyboard focus. Until then leave `featureList` at map-sdk's default on this branch; it must not ship in a beta that way.
- [ ] **Step 4: Browser check** (Playwright): Tab from the page reaches the List button at the top right, visible only while focused; Enter opens the list; Escape closes it; the toolbar is untouched. Commit `feat: load screen on map ready, theme tokens, List button placement`.

### Task 14: Package entries, bundle check and docs

**Files:**
- Modify: `src/lib/index.ts`, `src/lib/core.ts`, `src/lib/lazy-routes.ts` (unchanged API), `tests/bundle/check-bundle.mjs`, `package.json` (`peerDependencies`, `dependencies`, drop unused: `@tstk/*`, `@turf/area`, `color2k`, `date-fns` if nothing imports them), `CLAUDE.md`, `README.md`

- [ ] **Step 1:** Extend `check-bundle.mjs`'s forbidden pattern to `/maplibre|maptiler|uplot|weather/i` and add a check that `./core` exports exactly: `ROUTER_KEY`, `provideMonitorMapRouter`, `useMonitorMapRouter`, `monitorsManager`, `configureMonitorMap`, `monitorMapConfig` (runtime names). Run → PASS.
- [ ] **Step 2:** `npx depcheck` (or grep) to drop unused deps; `npm run build` produces `dist/monitor-map/sjvairMonitorMap.js` and `.css` (check with `ls`), and `npm run build:lib` produces `dist/lib/{index,core,lazy-routes}.js`.
- [ ] **Step 3: Docs.** Rewrite `CLAUDE.md`'s architecture for 5.0 (map-sdk, stores, `mapOptions`, plugin sync and draw order, wind and EV plugins, keys config, theming, the browser test project; remove the integration-system sections and fixed known issues). `README.md`: a "Migrating from 4.x" section listing exactly the spec's "What changes for consumers" (mobile: keys via `configureMonitorMap`, SDK peer, `meta.scale`, map-sdk `@source` and `theme.css`; removed exports).
- [ ] **Step 4:** Full gate: `npm run check && npm run lint && npm test && npm run test:bundle`. Commit `chore: 5.0 entries, bundle check and docs`; open PR 6; tell the coordinator.

## Before "ready" (Tasks 15–16)

### Task 15: Comparison page

**Files:**
- Create: `scripts/compare/compare.mjs` (Playwright), committed; output `/home/alex/workspace/sjvair/monitor-map/compare-5.0.html` plus `compare-5.0/` screenshots at the top of the main checkout, **uncommitted**.

- [ ] **Step 1:** The script opens the 5.0 dev server (local stack) and `https://www.sjvair.com/` (read-only: no logins, no forms) at 1440×900 and 390×844, and captures each state in the spec's "Testing and the parity check" list, the same state on both sides where reachable (same center/zoom via the UI, not by editing production pages).
- [ ] **Step 2:** Generate the page: pairs side by side, each labeled same / fix / accessibility / question, with a one-line note; fixes and ZIP-list changes listed. Ask the user before putting Chrome in focus for hands-on checks.
- [ ] **Step 3:** Give the user the full path; collect their verdicts; fix or ask on each "question". Report results to the coordinator.

### Task 16: Published map-sdk, PR CI and the first beta

Each step needs the user's explicit yes; none is automatic.

- [ ] **Step 1:** Tell the coordinator the plan now needs a published map-sdk `0.x` (user's yes, after the npm trusted publisher setup). Wait.
- [ ] **Step 2:** Once published: `"@sjvair/map-sdk": "^0.1.0"` (or the published prerelease's exact range), remove `vendor/` use from `package.json`, `npm install`, full gate. PR into `release/5.0.0`.
- [ ] **Step 3:** Add `.github/workflows/ci.yml`: on PRs into `release/5.0.0` and `main`, Node 26, `npm ci`, `npx playwright install --with-deps chromium`, `npm run check`, `npm run lint`, `npm test`, `npm run test:bundle`.
- [ ] **Step 4:** Ask the user for `5.0.0-beta.0`: bump the version, and with their yes create the GitHub Release (prerelease) from `release/5.0.0`; confirm `npm view @sjvair/monitor-map dist-tags` shows it under `next`. Tell the coordinator (mobile can start).
- [ ] **Step 5:** Go-live day only, with the user's yes: merge `release/5.0.0` into `main` before sjvair.com `develop` deploys; release `5.0.0` with its own yes.
