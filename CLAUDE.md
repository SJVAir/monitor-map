# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Widget build (PROD_MODE=production vite build, code-split ES modules)
npm run build:lib    # Library build (svelte-package into dist/lib)
npm run preview      # Preview widget build
npm run check        # Type-check Svelte components
npm run check:watch  # Type-check in watch mode
npm run lint         # Prettier check + ESLint
npm run format       # Auto-format with Prettier
npm test             # Vitest (specs in tests/**)
npm run test:bundle  # build:lib, then check the light entries keep the map engine off the eager path
npm run map-sdk:pack # Optional: pack ../map-sdk into vendor/ (see map-sdk below)
```

Vitest has three projects (`vitest.config.ts`). `server` (everything outside `tests/client/` and
`tests/browser/`) compiles rune modules in server mode, so `$effect`s do not run. `client`
(`tests/client/**`) compiles them for the browser (`tests/client/environment.ts`), so `$effect`s
run, but there is no DOM: it is for rune modules, not components. Svelte is inlined there, so
after `vi.resetModules()` a spec must take `flushSync` from a fresh `await import("svelte")`.
`browser` (`tests/browser/**`) runs component specs in real Chromium through Playwright
(`vitest-browser-svelte`). Specs live in top-level `tests/` so they never ship in the package.

## Architecture Overview

A **Svelte 5 + Vite** app that shows real-time air quality monitor data on an interactive map
built on **`@sjvair/map-sdk`** (which drives `@maptiler/sdk`) and **`@sjvair/sdk` 5.0** for the
data. It produces a code-split ES module widget (embedded in a Django HTML template via
`<div id="SJVAirMonitorMap">`) and exports `src/lib/` as a component library for the Capacitor
mobile app (`../mobile`). The SDK's dev pin is `5.0.0-beta.10` and its peer range `^5.0.0-beta.10`.

### Entry, routing and keys

- `src/main.ts` mounts `App.svelte` into `#SJVAirMonitorMap`. `App.svelte` calls
  `configureMonitorMap({ maptilerKey, nrelKey })` with `import.meta.env.VITE_MAPTILER_KEY` /
  `VITE_NREL_KEY`, then `provideMonitorMapRouter(...)` with `basePath: ""` and renders `<Router />`.
- The library never reads `import.meta.env`. Keys come only from `configureMonitorMap`
  (`src/lib/config.svelte.ts`; `monitorMapConfig()` throws before it is called). Never hardcode,
  print or commit a key.
- `src/router.ts` creates the sv-router instance; `src/lib/routes.ts` is the eager
  `monitorMapRoutes` (layout `MonitorMapLayout`, `/` is `MainMapView`, `/monitor/:id` a lazy
  `MonitorDetailPanel`). `src/lib/lazy-routes.ts` is the on-demand variant.

### The map

- `MonitorMapLayout` (`src/lib/MonitorMapLayout.svelte`) builds the map per layout mount with
  `createLiveMap()` (`src/lib/map/live-map.svelte.ts`: globe, Streets v4, map-sdk's
  `defaultBasemaps`) and renders it in `MapShell` (`src/lib/map/MapShell.svelte`), which owns the
  load screen, the panel slide (desktop 2/3 + 1/3, mobile 50/50), the toolbar and overlay slots of
  map-sdk's `MapView`, and the sv-router click escape-hatch (`routerEscapeHatch`). Features are
  map-sdk **plugins**, not hand-managed layers.
- App-wide data stores are created once in `src/lib/stores.svelte.ts` (map-sdk's monitors, HMS
  smoke/fire and collocation-sites stores). It imports only `@sjvair/map-sdk/stores`, so `/core`
  can reach it without the map engine. `monitorsManager` (`src/lib/monitors/monitors.svelte.ts`)
  is a thin wrapper over the monitors store.
- Option state is one flat `OptionValues` record, `mapOptions`
  (`src/lib/options/option-values.svelte.ts`). Its defaults are map-sdk's presets' plus those of
  monitor-map's own rows (EV Chargers and its levels, Wind), declared beside the rows in
  `toolbar-groups.ts` (`buildToolbar`). `createMonitorMapToolbar`
  (`options/monitor-map-toolbar.svelte.ts`) is the toolbar's wiring, used by `MonitorMapLayout`
  and the toolbar spec's harness. Plugins and `filteredMonitors` read `mapOptions`. The pollutant
  is `monitorsManager.pollutant`; pollutant **None** is not a value of it: it turns monitors off
  (URL `?pollutant=none`, `src/lib/options/pollutant-param.ts`). The `?pollutant=` sync lives in
  `MonitorMapLayout`.
- `src/lib/options/plugin-order.ts` holds `DRAW_ORDER` (bottom to top: `wind`, `hms-smoke`,
  `hms-fire`, `collocation-sites`, `monitors`, `ev-l2`, `ev-l3`), `beforeId` and `wantedPlugins`
  (which plugins the options want). `syncPlugins` (`src/lib/map/sync-plugins.svelte.ts`) adds and
  removes plugins in that order. `MonitorMapLayout` makes two calls: one whose `deps` read
  `clustered` (monitors and EV, which take it when built), one without (wind, HMS, collocation).
- `filteredMonitors` (`src/lib/monitors/filtered-source.svelte.ts`) applies the monitor-group
  options to the monitors the map plugin shows.
- Wind: `src/lib/wind/wind-plugin.ts`, a map-sdk custom layer over `@maptiler/weather`. It sets
  MapTiler's global `apiKey` for that package.
- EV chargers: `src/lib/ev-stations/` (`ev-store`, `ev-plugin`, the station popup, `zip-codes.ts`
  with `EV_ZIP_CODES`). `scripts/check-ev-zips.mjs` checks the ZIP list.
- Search: `src/lib/search/` (`Search.svelte`, `service.ts`, `search-pin.svelte.ts`), moving the
  map-sdk camera. The legend is `src/lib/legend/Legend.svelte`, a card around map-sdk's `Legend`.
- The options toolbar is map-sdk's `OptionsToolbar`, rendered by `MonitorMapLayout` in
  `MapShell`'s `toolbar` slot with the search box in its `search` snippet. `buildToolbar`
  (`src/lib/options/toolbar-groups.ts`) assembles its groups from map-sdk's presets
  (`monitorsOptions`, `hmsOptions` and the settings preset), plus monitor-map's own Layers (EV
  chargers with Level 2 and 3) and Overlays (Wind) groups. The icons are snippets in
  `MonitorMapLayout`; `row-icons.ts` holds only the EV level markers' SVG. Labels, help text and
  the monitor types come from map-sdk and the SDK metadata. `onOptionsChange` writes changes into
  `mapOptions`; the pollutant is bridged to `monitorsManager` and `monitorsOn`
  (`option-values.svelte.ts`, `pollutant-param.ts`), and the basemap to the map's basemap store.
  The wide/narrow switch is map-sdk's, measured on `MapShell`'s outer box (`MapView`'s
  `layoutRoot`) so the open panel doesn't collapse the toolbar; `isWideLayout()` in
  `src/lib/map/layout.ts` is read only at event time, for behavior that follows the page layout
  (Tailwind `md`). The legend is an overlay (`src/lib/legend/LegendOverlay.svelte`) placed below
  `--mapsdk-toolbar-height`, with no z-index so map-sdk's toolbar, list and card stack above it.
- `MonitorDetailPanel` owns a `MonitorDetailsState` (`monitors/monitor-details.svelte.ts`) that
  fetches its monitor with `getMonitorDetails(id)`. `choosePanelPollutant`
  (`monitors/panel-pollutant.ts`) picks the pollutant shown. Only an active monitor's readings
  count as current: the API keeps returning an inactive monitor's last reading. The panel
  re-fetches when the monitors store's latest readings are replaced; `DataChart` takes `pollutant`
  and `refreshTick` props and reloads on a tick only while its date range is live.

### Theming

map-sdk's components use theme tokens. The widget defines them in `src/app.css` (white UI, light
only) and imports `@sjvair/map-sdk/theme.css` with `@source "../node_modules/@sjvair/map-sdk/dist"`;
the CSS scope plugin keeps them inside `#SJVAirMonitorMap`. `dist/lib` ships no token CSS: library
hosts supply their own tokens.

### map-sdk

`@sjvair/map-sdk` is the published npm version, pinned exactly (`0.1.0-beta.14`). To try an
unreleased map-sdk locally, `npm run map-sdk:pack` packs `../map-sdk` into `vendor/` (git-ignored)
and prints the tarball path to `npm install`; never commit that. `@maptiler/sdk` is pinned
`~4.2.0` (map-sdk's pin); `npm ls @maptiler/sdk svelte @sjvair/sdk` must show one copy of each. A
map-sdk gap is reported, not worked around with CSS overrides or map-sdk internals.

### Svelte 5 runes

The codebase uses runes exclusively (`$state`/`$state.raw`, `$derived`, `$effect`), plus the
attachment API for DOM lifecycle. Inside `DataChart`, effects that should react to a prop's value
read it through a `$derived`, because the panel recomputes what it passes on every refresh.

### Environment variables

```
VITE_MAPTILER_KEY=
VITE_NREL_KEY=
```

### Package entries

`package.json` `exports` has three entries, all built by `svelte-package` into `dist/lib`:

- `.` (`src/lib/index.ts`): `monitorMapRoutes` (eager), `configureMonitorMap`,
  `monitorMapConfig`, the router context, `monitorsManager` and `monitorMapUserChanged`. Nothing
  else is exported.
- `./core` (`src/lib/core.ts`): the router context, `monitorsManager`, `configureMonitorMap`,
  `monitorMapConfig` and `monitorMapUserChanged`, and nothing that reaches `@maptiler/sdk`,
  `@maptiler/weather`, maplibre or `uplot` at runtime.
- `./routes` (`src/lib/lazy-routes.ts`): `monitorMapRoutes` whose layout and monitor panel load
  on demand. Its components are light eager wrappers (`LazyMapLayout`, `LazyMonitorDetailPanel`)
  that load the real ones through `src/lib/lazy-chunks.ts` and show the load screen (or
  "Loading..." in the panel, or a retry on failure) meanwhile. They are not `() => import(...)`
  routes because sv-router renders nothing for a route until every lazy component on it has
  loaded. The dynamic imports must stay in `lazy-chunks.ts`, never in a wrapper: sv-router detects
  lazy components by regex on the function source, and a compiled component containing
  `() => import(...)` would be called as one (`tests/client/lazy-routes.test.ts` guards this).

`core.ts` re-exports, and the lazy wrappers load, the same modules `.` uses, so the singletons stay
single across entries. `npm run test:bundle` (`tests/bundle/check-bundle.mjs`) bundles the entries
from `dist/lib` and fails if maplibre, maptiler, `@maptiler/weather` or uplot is reachable without
a dynamic import, if `./core` exports anything other than `ROUTER_KEY`, `configureMonitorMap`,
`monitorMapConfig`, `monitorMapUserChanged`, `monitorsManager`, `provideMonitorMapRouter` and
`useMonitorMapRouter`, if an `exports` target is missing, or if the two on-demand imports are gone
from the startup bundle; the release workflow runs it before publishing.

### Cancelling requests (`src/lib/abort.ts`)

`SignalOptions` (`{ signal? }`), `anySignal` (combine signals, with `dispose()`) and `untilAborted`
(reject a wait when a signal aborts) are the building blocks. Work the library starts itself
(detail panel, chart, subscription status via `monitors/subscriptions.ts`) is cancelled through
its own `AbortController`, and a superseded call **resolves quietly**. A **caller's** signal that
aborts **rejects** with its reason. `monitorsManager.init()` is shared: a caller's signal cancels
only that caller's wait, and the run aborts only when every waiting caller has aborted and every
caller passed a signal.

### `monitorsManager.init()` rules

`init()` is safe to call from several places. Overlapping calls share one promise; a rejection
clears it so a later call retries. An explicit `"pm25"`/`"o3"` wins over a call without one, and
the most recent of two explicit values wins. Once initialized, `init()` is a no-op.
`init(pollutant, { autoUpdate: false })` loads without starting the poll (for a host preloading
data with no map shown); polling starts if any call sharing the run wanted it.
`MonitorMapLayout` stops polling on destroy and calls `monitorsManager.resumeAutoUpdate()` on
mount.

## Library Packaging (`build:lib`)

`npm run build:lib` runs `svelte-package` (not a hand-rolled Vite/Rollup lib
build) to produce `dist/lib`, which `package.json`'s `"svelte"`/`"types"`/
`"exports"` fields point at (not raw `src/lib` — pointing there was a bug fixed
2026-07; raw `src/lib` still ships in `files` for reference/debugging, but is no
longer a declared entry point). `svelte-package` rewrites internal `$lib`
imports to relative paths and emits `.d.ts`/`.svelte.d.ts` declarations
alongside compiled `.ts`→`.js`; it deliberately leaves `.svelte` files
themselves uncompiled (consumers must compile them with their own Svelte
version — this is standard for published Svelte component libraries, not a gap).

Consequences for any consuming app:

- No `$lib` alias is needed: `svelte-package` rewrites every internal `$lib`
  import (including `.svelte` files and `<enhanced:img>` image paths) to a
  relative path, so `dist/lib` contains no `$lib` references.
- `LoadScreen.svelte` uses `<enhanced:img>`, which isn't valid HTML until the
  host app's own Vite config runs `@sveltejs/enhanced-img`'s `enhancedImages()`
  plugin — hence it's a `peerDependency`, not just a `devDependency` here.
- The app's Tailwind must scan this package for classes (e.g. sjvair-mobile's
  `@source "../node_modules/@sjvair/monitor-map/dist/lib";`), and map-sdk's too:
  `@source "../node_modules/@sjvair/map-sdk/dist";` plus `@import "@sjvair/map-sdk/theme.css";`
  (the host defines the theme tokens map-sdk needs).

If you touch `vite.config.lib.ts` — it no longer exists; don't recreate it.

## Releases and publishing — standing restriction

Publishing to npm happens via `.github/workflows/release-package.yml`, triggered by a
GitHub Release being published. NEVER create a GitHub release, run `npm publish`, or
otherwise trigger this workflow without the user's explicit permission for that
specific release — every single time. Approval for one release does not carry forward
to the next, even later in the same session or as the natural next step of a task
already in progress (e.g. bumping a dependency and then "finishing" by releasing it).
Always stop and ask first, and wait for an explicit yes.

## Code Style

- **Tabs** for indentation (not spaces)
- **Double quotes** for strings
- No trailing commas
- Print width: 100 characters
- Prettier + ESLint (flat config, v10); run `npm run format` before committing
- Tailwind CSS v4 for styling; prefer utility classes and arbitrary values (`grid-cols-[2fr_1fr]`) over custom `<style>` blocks
- Never give a component and a `.svelte.ts` module the same base name in one folder (`Foo.svelte` + `foo.svelte.ts`) — `./foo.svelte` matches the component on case-insensitive filesystems (macOS); import rune modules with their full extension (`./foo.svelte.js`)
- Svelte's `class:` directive cannot handle Tailwind arbitrary values with brackets or colons — for simple toggles use a `$derived` class string; for complex multi-property responsive rules use a `<style>` block with semantic class names and `class:name={condition}`
