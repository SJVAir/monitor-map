# Shared Options Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace monitor-map's own options toolbar with map-sdk's `OptionsToolbar`, keeping every
row and behaviour, with the option values in one flat `OptionValues` record.

**Architecture:** `MonitorMapLayout` builds the toolbar's groups from map-sdk's presets
(`monitorsOptions`, `settingsGroup`, `hmsOptions`) plus monitor-map's own Layers/Overlays rows, and
passes `OptionsToolbar` to `MapShell`, which hands it to `MapView`'s `toolbar` snippet. The values
live in a module-level `$state` record; `wantedPlugins`, `filteredMonitors`, the `?pollutant=` sync
and Reset read it. The pollutant itself stays in `monitorsManager`.

**Tech Stack:** Svelte 5 runes, TypeScript, `@sjvair/map-sdk` `0.1.0-beta.13` (then the beta with
the layout root), `@sjvair/sdk` `5.0.0-beta.10`, Vitest (server / client / browser projects),
Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-11-13-shared-options-toolbar-design.md`

## Global Constraints

- Branch `feat/shared-options-toolbar` from `release/5.0.0`; PR into `release/5.0.0`. Never touch
  `main` or `.worktrees/5.0-design`. Don't modify map-sdk, mobile, sdk-js, sjvair.com or
  data-dashboard code.
- `@sjvair/map-sdk` pinned exactly: `0.1.0-beta.13` (Task 1), then the layout-root beta (Task 7).
- `@sjvair/sdk` dev pin `npm:@jsr/sjvair__sdk@5.0.0-beta.10`; peer range `^5.0.0-beta.10`.
- `npm ls @maptiler/sdk svelte @sjvair/sdk` shows one copy of each.
- No label, help text, unit, group heading, scale or color written into monitor-map where the
  metadata or map-sdk has it. EV Chargers, Level 2, Level 3 and Wind keep monitor-map's words.
- Icon tints (Lucide, exact): Monitors `RadioTower` `#4682b4`; Layers `Layers` `#708090`; Overlays
  `SquareStack` `#708090`; Settings `Settings` `#696969`; Marker Clusters `Network` `#1e90ff`;
  Basemap `Map` `#708090`; Theme `Contrast` `#708090`; Reset `RotateCcw`; Fire & Smoke `Flame`
  `#ff4500`; Collocation `Crosshair` `#4A5FC6`; None `Ban` `#778899`; EV Chargers `EvCharger`
  `#708090`; Wind `Wind` `#1e90ff`. PM2.5 and Ozone: `pm25-02-particle-field.svg`,
  `ozone-08-sunrise-haze.svg` as `<img>` snippets.
- `/core`, `/routes` and `.` exports unchanged; `npm run test:bundle` passes unchanged.
- Code style: tabs, double quotes, no trailing commas, width 100; `npm run format` before commits.
- No Claude/AI attribution in commits or PRs. Nothing touches production; no subscription or alert
  writes against the local stack.
- Timing-sensitive test failures under load: rerun alone before calling them bugs.

## Review Focus

1. **Metadata not loaded yet** (`monitorsManager.meta` null): the toolbar renders with no type rows
   and no crash; Reset before it loads leaves the pollutant as is. Test in Task 4.
2. **`?pollutant=none` on first load**: Monitors group disabled, monitors plugin off, the URL keeps
   `none`. Test in Task 2 (bridge) and Task 8 QA.
3. **Layout remount** (mobile switching tabs): every key but `basemap` survives; `basemap` goes back
   to `map.basemap.defaultId`. Test in Task 2.
4. **A basemap that fails to load or an unknown id**: the record follows `map.basemap.onFallback`,
   so record and map agree and Reset's `changed` is honest. Test in Task 2.
5. **A server type monitor-map has never seen**: it gets a row, is on by default (a missing
   `type:` key counts as on), and its monitors draw. Tests in Tasks 3 and 4.

---

### Task 1: Move to `@sjvair/map-sdk` `0.1.0-beta.13` and `@sjvair/sdk` `5.0.0-beta.10`

**Files:**
- Modify: `package.json` (deps, devDeps, peerDependencies), `package-lock.json`
- Modify: any `src/` or `tests/` code that builds a `Scale` or trips on the beta.7–beta.13 breaking
  changes (README "Changes" in `../map-sdk`); the extra `role="status"` element per `MapView`.

**Interfaces:**
- Produces: the new pins; everything else behaves as before (old toolbar still in place).

- [ ] **Step 1:** Set `@sjvair/map-sdk` to `0.1.0-beta.13` and the `@sjvair/sdk` dev pin to
      `npm:@jsr/sjvair__sdk@5.0.0-beta.10`, peer `npm:@jsr/sjvair__sdk@^5.0.0-beta.10`; `npm install`.
- [ ] **Step 2:** Run `npm ls @maptiler/sdk svelte @sjvair/sdk`. Expected: one copy of each.
- [ ] **Step 3:** Run `npm run check && npm test`. Fix each failure: `Scale` fixtures get
      `averaging_hours: null, daily_statistic: null, daily_statistic_label: null`; tests finding "the"
      status by role inside a map narrow it. Keep `basemaps.ts` and the old toolbar as they are.
- [ ] **Step 4:** Run `npm run check && npm run lint && npm test && npm run build && npm run test:bundle`.
      Expected: all pass.
- [ ] **Step 5:** Commit `chore: @sjvair/map-sdk 0.1.0-beta.13 and @sjvair/sdk 5.0.0-beta.10`.

### Task 2: The values record and the pollutant/basemap bridge

**Files:**
- Create: `src/lib/options/option-values.svelte.ts` (the old `map-options.svelte.ts` and
  `map-option-defaults.ts` stay until Task 5 deletes them with the old menus that use them)
- Test: `tests/options/map-options.test.ts` (server project)

**Interfaces:**
- Produces (all in `option-values.svelte.ts`):
  - `export const mapOptions: OptionValues` — module-level `$state({})`, the toolbar's values minus
    `pollutant`.
  - `export const monitorsDisplay: { monitorsOn: boolean }` — module-level `$state({ monitorsOn:
    true })`; satisfies `PollutantTargets["options"]` in `pollutant-param.ts`.
  - `export const MONITOR_MAP_DEFAULTS: OptionValues` — `{ inactive: false, inside: false,
    collocationSites: false, clustered: true, fireAndSmoke: true, evStations: false, "ev:lvl2":
    true, "ev:lvl3": true, wind: false }`.
  - `export function typeOn(values: OptionValues, type: string): boolean` — `values["type:" + type]
    !== false` (missing counts as on).
  - `export function toolbarDefaults(presetDefaults: OptionValues): OptionValues` —
    `{ ...presetDefaults, ...MONITOR_MAP_DEFAULTS }` (the spec's table wins over a preset).
  - `export function initMapOptions(defaults: OptionValues): void` — fills keys missing from
    `mapOptions` from `defaults` (never overwrites, so values survive a remount).
  - `export function toolbarValues(pollutant: string | null, monitorsOn: boolean,
    fallbackPollutant: string): OptionValues` — `{ ...mapOptions, pollutant:
    currentSelection(pollutant, monitorsOn) ?? fallbackPollutant }`.
  - `export function applyOptionChange(next: OptionValues, changed: string[], targets: {
    manager: PollutantTargets["manager"]; basemap: { select(id: string): void } }): void` — writes
    every changed key except `pollutant` into `mapOptions`; a changed `pollutant` goes through
    `applyPollutantSelection(next.pollutant, { manager, options: monitorsDisplay })`; a changed
    `basemap` calls `basemap.select(next.basemap)`.
  - `export function bindBasemap(basemap: { defaultId: string; onFallback(h: (id: string) => void):
    () => void }): () => void` — sets `mapOptions.basemap = basemap.defaultId` (the remount rule)
    and subscribes `onFallback` to write the shown id into `mapOptions.basemap`; returns the
    unsubscribe.
- Consumes: `currentSelection`, `applyPollutantSelection`, `PollutantTargets` from
  `pollutant-param.ts` (unchanged).

- [ ] **Step 1: Write the failing tests** in `tests/options/map-options.test.ts`, resetting the
      module state in `beforeEach` (`vi.resetModules()` + dynamic import):
  - `typeOn`: `typeOn({}, "newtype") === true`; `typeOn({ "type:airnow": false }, "airnow") === false`.
  - `toolbarDefaults({ inactive: true, "type:airnow": true, pollutant: "pm25" })` equals
    `{ "type:airnow": true, pollutant: "pm25", ...MONITOR_MAP_DEFAULTS }` with `inactive: false`.
  - `initMapOptions` fills missing keys and keeps `mapOptions.wind = true` set before it.
  - `applyOptionChange({ ...v, pollutant: "none" }, ["pollutant"], …)` sets
    `monitorsDisplay.monitorsOn = false` and never calls `manager.setPollutant`; then `"o3"` calls
    `setPollutant("o3")` and sets `monitorsOn` true.
  - `applyOptionChange` with `["basemap"]` calls `basemap.select` with the new id and writes it.
  - A Reset-shaped change (several keys) writes all of them in one call.
  - `toolbarValues("pm25", false, "pm25").pollutant === "none"`; `toolbarValues(null, true,
    "pm25").pollutant === "pm25"`.
  - Remount (Review Focus 3): `mapOptions.wind = true; mapOptions.basemap = "x"`, then
    `bindBasemap({ defaultId: "streets", onFallback })` → `wind` still true, `basemap === "streets"`.
  - Fallback (Review Focus 4): the handler `bindBasemap` passed to `onFallback`, called with
    `"streets"`, sets `mapOptions.basemap` to `"streets"`.
- [ ] **Step 2:** Run `npx vitest run tests/options/map-options.test.ts`. Expected: FAIL (exports
      missing).
- [ ] **Step 3:** Implement the Interfaces above in `option-values.svelte.ts`.
- [ ] **Step 4:** Run the test file. Expected: PASS.
- [ ] **Step 5:** Commit `feat: the options as one flat values record`.

### Task 3: Plugins and the monitor filter read the record

**Files:**
- Modify: `src/lib/options/plugin-order.ts`, `src/lib/monitors/filtered-source.svelte.ts`,
  `src/lib/MonitorMapLayout.svelte` (its `wantedPlugins`/`filteredMonitors`/`clustered` reads move
  to the new record, so `npm run check` passes). Until Task 5 the old menus still write the old
  `mapOptions`, which no longer drives the map: an expected in-between state, not a bug.
- Test: `tests/options/plugin-order.test.ts`, `tests/monitors/filtered-source.test.ts`,
  `tests/client/sync-plugins.test.ts` (update its fixtures only)

**Interfaces:**
- Produces:
  - `wantedPlugins(values: OptionValues, monitorsOn: boolean, pollutant: string | null):
    Set<PluginKey>` — same rules as today with keys `wind`, `fireAndSmoke`, `collocationSites`
    (pm25 only, needs `monitorsOn`), `evStations` + `ev:lvl2` / `ev:lvl3`.
  - `filteredMonitors(source, values: OptionValues): DataSource<MonitorFeatureProperties>` — shown
    when `typeOn(values, props.type)`, `(props.isActive || values.inactive === true)`, and
    `(props.location !== "inside" || values.inside === true)`.
- Consumes: `typeOn`, `MONITOR_MAP_DEFAULTS` (Task 2).

- [ ] **Step 1: Rewrite the tests** on records built from `MONITOR_MAP_DEFAULTS`: every existing
      `wantedPlugins` case with the new keys; `filteredMonitors` cases as today, plus Review Focus 5:
      a feature of type `"newtype"` with no `type:newtype` key is shown, and with
      `"type:newtype": false` it's hidden.
- [ ] **Step 2:** Run them. Expected: FAIL (old signatures).
- [ ] **Step 3:** Change both functions to the signatures above. `DRAW_ORDER` and `beforeId` are
      unchanged.
- [ ] **Step 4:** Run `npm run check && npm test`. Expected: PASS.
- [ ] **Step 5:** Commit `refactor: plugins and the monitor filter read the values record`.

### Task 4: The toolbar's groups

**Files:**
- Create: `src/lib/options/toolbar-groups.ts`
- Test: `tests/options/toolbar-groups.test.ts` (server project)

**Interfaces:**
- Produces:
  - `export interface ToolbarIcons { monitors, pm25, o3, none, collocation, layers, fireAndSmoke,
    evStations, overlays, wind, settings, clusters, basemap, theme, reset: OptionIcon; evLevel2,
    evLevel3: OptionIcon }`.
  - `export function monitorTypes(meta: { monitors: Record<string, { label: string }> } | null):
    string[]` — the meta's type keys sorted by `label` (`localeCompare`, base sensitivity); `[]`
    when null.
  - `export function mapPollutants(meta: { available_pollutants: string[] } | null): string[]` —
    `["pm25", "o3"]` filtered to those in `available_pollutants`, in that order; `[]` when null.
  - `export function buildToolbar(input: { monitors: MonitorsOptions; settings: OptionsPreset;
    hms: { row: OptionCheckbox; defaults: OptionValues }; meta: MonitorsMeta | null; selection:
    string | null; layersLabel: string; overlaysLabel: string; icons: ToolbarIcons }):
    OptionsPreset` — groups in order Pollutant, Monitors, Layers, Overlays, Settings; defaults via
    `toolbarDefaults` over the presets' defaults.
    - `monitors.groups({ types: monitorTypes(meta), pollutants: mapPollutants(meta), pollutant:
      selection === "none" ? null : selection, defaultPollutant: asPollutant(meta?.default_pollutant)
      ?? undefined, hasInactive: true, hasInside: true, collocation: true, none: true, icons: {
      monitors, pollutant: { pm25, o3 }, none, collocation } })`.
    - When `mapPollutants(meta)` is empty (meta not loaded), leave `pollutant` out of `defaults`,
      so a Reset before the metadata loads leaves the pollutant as is (Review Focus 1).
    - Set `cluster: "monitors"` on the returned Pollutant and Monitors groups; `cluster: "options"`
      on Layers, Overlays, Settings.
    - Layers: `{ id: "layers", label: layersLabel, icon: layers, cluster: "options", rows: [hms.row
      (with icon fireAndSmoke), { kind: "checkbox", id: "evStations", label: "EV Chargers", icon:
      evStations, children: [{ kind: "checkbox", id: "ev:lvl2", label: "Level 2", icon: evLevel2 },
      { kind: "checkbox", id: "ev:lvl3", label: "Level 3", icon: evLevel3 }] }] }`.
    - Overlays: `{ id: "overlays", label: overlaysLabel, icon: overlays, align: "end", cluster:
      "options", rows: [{ kind: "checkbox", id: "wind", label: "Wind", icon: wind }] }`.
- Consumes: `toolbarDefaults` (Task 2); `asPollutant` (`pollutant-param.ts`); map-sdk's
  `MonitorsOptions`, `OptionsPreset`, `OptionCheckbox`, `OptionIcon`.

The caller passes `layersLabel = map.messages("mapsdk_options_layers")` and `overlaysLabel =
map.messages("mapsdk_options_overlays")`; `settings` is `settingsGroup(map, { icon, clusters: {
icon }, basemap: { icons: { basemap, theme } }, reset: { icon } })`.

- [ ] **Step 1: Write the failing tests** with a fake `MonitorsOptions` (records its input and
      returns `{ groups: [{ id: "pollutant", label: "PM2.5", rows: [] }, { id: "monitors", label:
      "Monitors", rows: [] }], defaults: { pollutant: "pm25", "type:airnow": true } }`) and
      `{ svg: "<svg/>" }` icons:
  - `monitorTypes` on labels `{ purpleair: "PurpleAir", airnow: "AirNow", bam1022: "BAM 1022",
    aqview: "AQview", aqlite: "AQLite" }` → `["airnow", "aqlite", "aqview", "bam1022", "purpleair"]`.
  - `monitorTypes(null)` and `mapPollutants(null)` → `[]` (Review Focus 1); `buildToolbar` with
    `meta: null` returns five groups without throwing, and its `defaults` has no `pollutant` key.
  - `mapPollutants({ available_pollutants: ["o3", "pm25", "pm10"] })` → `["pm25", "o3"]`.
  - The input to `monitors.groups` has `pollutant: null` for selection `"none"`, `hasInactive` and
    `hasInside` true, `collocation` and `none` true, `defaultPollutant` from the meta.
  - Group ids in order `["pollutant", "monitors", "layers", "overlays", "settings"]`; clusters
    `["monitors", "monitors", "options", "options", "options"]`; Overlays `align: "end"`.
  - Layers' EV row has children ids `["ev:lvl2", "ev:lvl3"]`.
  - `defaults` include `MONITOR_MAP_DEFAULTS` and the preset's `pollutant` and `type:` keys.
- [ ] **Step 2:** Run `npx vitest run tests/options/toolbar-groups.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `toolbar-groups.ts` to the Interfaces.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit `feat: build the toolbar's groups from map-sdk's presets`.

### Task 5: Render map-sdk's toolbar; remove the old one

**Files:**
- Modify: `src/lib/map/MapShell.svelte` (drop `menu`/`search`/`OptionsBar`; add `toolbar?:
  Snippet` passed to `MapView`'s `toolbar`; render `overlays` inside `MapView`'s `overlays`
  snippet; `featureList={{ reveal: "focus" }}`)
- Modify: `src/lib/MonitorMapLayout.svelte` (icon snippets, `monitorsOptions(map)` once,
  `$derived` toolbar, `OptionsToolbar` with `groups`, `values`, `onchange`, `defaults`,
  `basemapKey="basemap"`, `search`; `syncPlugins`/EV effect/`?pollutant=` sync on the record;
  `bindBasemap(map.basemap)` in `onMount`; `initMapOptions` when the defaults change)
- Modify: `src/lib/map/live-map.svelte.ts` (`basemaps: defaultBasemaps({ keepPoiLabels: true })`)
- Create: `src/lib/map/layout.ts` (move `WIDE_LAYOUT_QUERY`, `isWideLayout` here); modify
  `src/lib/legend/Legend.svelte` import
- Delete: `OptionsBar.svelte`, `OptionsMenu.svelte`, `OptionsGroup.svelte`,
  `options-state.svelte.ts`, `group-state.ts`, `layout.ts`, `map-options.svelte.ts`,
  `map-option-defaults.ts`, `menus/`,
  `rows/` (all in `src/lib/options/`); `src/lib/map/basemaps.ts`; in `monitor-groups.ts`
  `REFERENCE_GRADE_TYPES`, `LOW_COST_TYPES`, `MonitorGroupType` (delete the file if nothing else
  uses `typeSupportsPollutant`); `row-icons.ts` keeps only `evLevel2`, `evLevel3`; their tests
  (`tests/options/group-state.test.ts`, `tests/options/map-option-defaults.test.ts`, any
  `basemaps`/`monitor-groups` tests)
- Test: `tests/browser/options-toolbar.test.ts` + `tests/browser/ToolbarHarness.svelte`

**Interfaces:**
- Consumes: Tasks 2–4. `MapShellProps.menu` and `.search` are removed and `.toolbar?: Snippet`
  added (`MapShell` is internal; not exported).
- Produces: the running toolbar.

`onchange` in the layout: `(next, changed) => applyOptionChange(next, changed, { manager:
monitorsManager, basemap: map.basemap })`. `values`: `toolbarValues(monitorsManager.pollutant,
monitorsDisplay.monitorsOn, defaults.pollutant as string)`. The `?pollutant=none` first-load check
writes `monitorsDisplay.monitorsOn = false`.

- [ ] **Step 1: Write the failing browser test.** `ToolbarHarness.svelte` renders `OptionsToolbar`
      (outside a `MapView`, so the wide row) from `buildToolbar` with a fake map (`messages: k => k`,
      a `metadata` provider answering two groups, types `airnow` (reference) and `purpleair`
      (low-cost), pm25/o3 labels, units and help; `basemap` with two styles) and a fake manager, and
      wires `applyOptionChange`. Cases:
  - the triggers read, in order, the pollutant, `mapsdk_options_monitors`, `mapsdk_options_layers`,
    `mapsdk_options_overlays`, and the Settings button (`mapsdk_options_settings`);
  - picking None in Pollutant sets `monitorsDisplay.monitorsOn` false and the Monitors trigger
    `aria-disabled`/disabled;
  - the Reference-grade heading off flips `type:airnow` in one `onchange` call;
  - EV Chargers on shows Level 2 and Level 3; off hides them;
  - after changing Wind and a type, Reset Map Options puts `MONITOR_MAP_DEFAULTS` back in one call.
- [ ] **Step 2:** Run `npx vitest run --project browser tests/browser/options-toolbar.test.ts`.
      Expected: FAIL (harness imports missing).
- [ ] **Step 3:** Make the file changes listed above. The legend wrapper keeps its current classes
      here; Task 6 changes them.
- [ ] **Step 4:** Run `npm run check && npm run lint && npm test && npm run build &&
      npm run test:bundle`. Expected: all pass; `grep -rn "options/menus\|OptionsBar\|basemapChoices"
      src tests` finds nothing.
- [ ] **Step 5:** Commit `feat: monitor-map renders map-sdk's options toolbar`.

### Task 6: The legend below the toolbar and clear of the controls

**Files:**
- Modify: `src/lib/MonitorMapLayout.svelte` (legend wrapper), `src/lib/legend/Legend.svelte`
  (card width cap)
- Test: `tests/browser/legend-card.test.ts`

**Interfaces:**
- Consumes: `--mapsdk-toolbar-height` and `--mapsdk-map-width`, both set by `MapView` on the map's
  box (the legend is inside `MapView`'s `overlays` since Task 5).

The wrapper's `top-18 md:top-32` become `top-[calc(var(--mapsdk-toolbar-height,0px)+1rem)]`. The
card's `max-w-[calc(100vw-2rem)]` becomes a cap from `--mapsdk-map-width` that leaves the engine's
right-hand control column (10px margin + 29px buttons) plus an 8px gap clear: with the legend at
`left-4`, `max-w-[calc(var(--mapsdk-map-width,100vw)-1rem-3rem-8px)]` or the builder's equivalent.

- [ ] **Step 1: Write the failing tests:** inside a 390px-wide box with `--mapsdk-map-width: 390px`
      and the card at `left: 16px`, the expanded card's `getBoundingClientRect().right <= 390 - 39 -
      8`; at 1440px it keeps its `w-84` width (336px).
- [ ] **Step 2:** Run `npx vitest run --project browser tests/browser/legend-card.test.ts`. Expected:
      FAIL on the 390px case.
- [ ] **Step 3:** Change the wrapper offset and the card cap as above.
- [ ] **Step 4:** Run the file. Expected: PASS.
- [ ] **Step 5:** Commit `fix: legend below the toolbar and clear of the map controls`.

### Task 7: The layout root (waits on map-sdk)

Blocked until the coordinator reports the map-sdk beta with the layout root and its final API name
(proposed `mapLayoutRoot`, an attachment). If it isn't published before the PR is ready, skip this
task, add a `DEFERRED.md` entry (miss to finish before the mobile beta) in Task 8, and say so in the
PR.

**Files:**
- Modify: `package.json`, `package-lock.json`; `src/lib/map/MapShell.svelte` (the attachment on the
  outer `relative flex h-full w-full flex-col md:flex-row` box)
- Test: `tests/browser/map-layout-root.test.ts`

- [ ] **Step 1:** Pin `@sjvair/map-sdk` to that beta exactly; `npm install`; `npm ls` shows one copy
      each. Apply any breaking change its README "Changes" lists.
- [ ] **Step 2: Write the failing test:** a 1024px root with the attachment holding a 683px
      `MapView` whose toolbar is `ToolbarHarness`'s → the wide row (no "Open map options" button);
      the same at a 390px root → the options button. (Use the API's documented test seam if
      map-sdk gives one; otherwise a real `MapView` in the browser project.)
- [ ] **Step 3:** Run it. Expected: FAIL at 1024px.
- [ ] **Step 4:** Put the attachment on `MapShell`'s outer box. Run it. Expected: PASS.
- [ ] **Step 5:** Run the full suite (`check`, `lint`, `test`, `build`, `test:bundle`). Commit
      `feat: the toolbar's layout follows the map's mount point`.

### Task 8: Docs, version, QA, PR

**Files:**
- Modify: `CLAUDE.md` (options section: toolbar from map-sdk, the values record, the pollutant
  bridge, `src/lib/map/layout.ts`; the map-sdk pin; the sdk pin and peer range), `README.md` (same,
  where it describes the toolbar or the peer range), `package.json` `version` → `5.0.0-beta.2`
- data-dashboard `step-5` via `../data-dashboard/.worktrees/docs-monitor-map` (detached; commit;
  `git pull --rebase origin step-5`; `git push origin HEAD:step-5`; prettier first): `DEFERRED.md`
  close "an expanded legend can run under the zoom and compass buttons at 390 px" and item (3) of
  "final-review minors from #131 and #132"; add the Task 7 miss if it was skipped;
  `ARCHITECTURE.md` → "Map SDK" (monitor-map on the shared toolbar). `TODO.md`'s row only after the
  coordinator says the dashboard's spec 3 PR into `step-5` is closed.

- [ ] **Step 1:** Update the docs and version; `npm run format`.
- [ ] **Step 2:** Run `npm run check && npm run lint && npm test && npm run build &&
      npm run test:bundle`. Expected: all pass.
- [ ] **Step 3:** Scripted QA against the running dev server on 5173 (start one only if none runs;
      never kill the user's) and the local stack, headless Chrome as in the comparison script, at
      1440 and 390 px: every group opens and its rows change the map; `?pollutant=none` on load
      keeps `none` in the URL and Monitors disabled (Review Focus 2); Esc returns focus to the
      trigger; the 390px options panel opens and closes by touch; with reduced motion the panel
      doesn't slide; the legend sits under the toolbar and clear of the right-hand controls at 390
      px; "BAM 1022" shows under Reference-grade. No subscribing.
- [ ] **Step 4:** Commit `docs: the shared options toolbar`; push the branch; open the PR into
      `release/5.0.0` (no AI attribution) listing: the visible differences (BAM 1022, basemap switch
      to the default variant, no Basic/Toner/Voyager), the Task 7 status, and what mobile must change
      (spec section).
- [ ] **Step 5:** Tell the coordinator (`data-dashboard-81`) the PR link and the peer-range change.
      Merging, and the `5.0.0-beta.2` GitHub Release for mobile, each wait for the user's own yes.
