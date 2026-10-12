# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Widget build (vite build, code-split ES modules)
npm run build:lib    # Library build for Capacitor app workspace import
npm run preview      # Preview widget build
npm run check        # Type-check Svelte components
npm run check:watch  # Type-check in watch mode
npm run lint         # Prettier check + ESLint
npm run format       # Auto-format with Prettier
npm test             # Vitest (specs in tests/**)
npm run test:bundle  # build:lib, then check the light entries keep maplibre off the eager path
```

Vitest covers the pure modules (`legend-data`, `group-state`, `pollutant-param`, `basemap`, `map-option-defaults`, `monitor-groups`) and `monitorsManager` (`tests/monitors/monitors-manager.test.ts`, with `@sjvair/sdk` mocked and the module re-imported per test); specs live in top-level `tests/` so they never ship in the package. `vitest.config.ts` loads the Svelte plugin so rune modules compile; they compile in server mode there, so `$effect`s do not run in specs.

## Architecture Overview

This is a **Svelte 5 + Vite** app that visualizes real-time air quality monitor data on an interactive map powered by **MapTiler SDK**. It produces a code-split ES module widget (embedded in a Django HTML template via `<div id="SJVAirMonitorMap">`) and exports `src/lib/` as a component library for a Capacitor mobile app.

### Entry & Routing

- `src/main.ts` — mounts `App.svelte` into `#SJVAirMonitorMap`
- `src/router.ts` — creates the sv-router instance (`createRouter`); exports `{ p, navigate, isActive, route }`
- `src/App.svelte` — persistent shell: holds the map, menu overlays, and `<Router />` outlet. Uses a CSS grid with animated `grid-template-columns` / `grid-template-rows` to slide the detail panel in from the right (desktop, 2/3 + 1/3 split) or up from the bottom (mobile, 50/50). After the 300 ms CSS transition, calls `map.resize()` so MapTiler reflows.
- `src/MonitorDetailPanel.svelte` — lazy-loaded via `() => import(...)` in the router; rendered at `/monitor/:id`
- `src/MapView.svelte` — empty sentinel component for the `/` route (the map lives in `App.svelte`, not the outlet)

### Integration Plugin System

The core architectural pattern is a plugin system for map features:

- `src/lib/map/integrations/` — Abstract base classes:
  - `MapIntegration` — base (apply/remove lifecycle)
  - `MapLayerIntegration` — adds MapTiler layer management
  - `MapGeoJSONIntegration` — adds GeoJSON data source management
- `IntegrationsManager` — `@Singleton` that registers and coordinates all integrations
- Integrations are passed as props to `Map.svelte` and applied/removed based on their `enabled` state

New map features should extend one of these base classes rather than manipulating the map directly.

Integration effect pattern: an integration's own `$effect`s that guard on `enabled` read it
via `untrack` (the base `MapLayerIntegration` effect already applies/removes on `enabled`
changes) — and that guard must come **after** the effect's tracked reads, or an early return
leaves the effect with no dependencies and it never runs again. Integrations must not touch the
style (add/remove sources or layers, register clicks — including inside `icons.loadIcons().then(...)`)
while `mapManager.styleLoading` is true: a basemap change is in flight, and the
`integrationsManager.refresh()` on `style.load` applies/removes every integration afterwards.

### Modularization: `MapShell` vs `MonitorMapLayout`

`MonitorMapLayout` (used by `monitorMapRoutes`) is a **thin, opinionated
wrapper** around `MapShell` that wires up every integration, every manager,
and the options toolbar/panel (`src/lib/options/`) and legend (`src/lib/legend/`) — this is what the widget build and
the `sjvair-mobile` Capacitor app (`../mobile`) use. 4.0.0 replaces the old display-options menu and legend components (and their
exports) with these.

`MapShell` is the **generic primitive** underneath it: it owns only layout
concerns that don't know which integrations exist (load screen, panel
resize/transition, the sv-router click escape-hatch) and takes
`integrations`, `ready`, `panelOpen`, `knownRoutes`, and `menu`/`search`/`overlays`/
`children` snippets as props. A host that wants a reduced feature set (e.g.
only the monitors integration, no EV stations/wind/HMS) should compose
`MapShell` directly instead of going through `monitorMapRoutes`/
`MonitorMapLayout` — see `src/lib/MonitorMapLayout.svelte` itself as the
reference example of how to wire a manager, an integration list, and menu/
overlay content into it.

`MapShell`'s `menu` snippet renders inside `OptionsBar` — compose `OptionsGroup`/`OptionsMenu`/row components there; its `search` snippet is placed in the toolbar. The toolbar vs. full-screen panel switch is pure CSS at Tailwind `md`; only `isWideLayout()` (`src/lib/options/layout.ts`) is read at click time.

The five exported menus (`PollutantMenu`, `MonitorsMenu`, `LayersMenu`, `OverlaysMenu`, `SettingsMenu`) are bound to the singleton managers/integrations; a host with a custom `MonitorsDataSource` composes `OptionsMenu` with the row components (`CheckboxRow`, `RadioRow`, `SubmenuRow`, `GroupRow`) instead.

`MapShell` only needs monitor-map's router context (`useMonitorMapRouter`)
when `routerEscapeHatch` is enabled (the default) and no `basePath` prop is
passed directly — pass `routerEscapeHatch={false}` (or a `basePath` prop) to
use `MapShell` standalone without a `provideMonitorMapRouter(...)` ancestor.
A host embedding `MapShell` inside its own app with its own routing (e.g. a
dashboard with unrelated tabs/navigation) **must** pass
`routerEscapeHatch={false}`, since the escape-hatch's click interception is
designed for a full-page map, not one embedded alongside unrelated app
navigation, and will otherwise force full-page reloads on the host's own
links. Mount at most one `MapShell` per app instance — its underlying
map/load-screen/integration-registration state is module-level singleton
state shared across the whole page.

### Monitor Data Flow

1. **`App.svelte`** calls `monitorsManager.init()` and `collocationSitesManager.init()` on mount, which fetch metadata, monitor list, and latest readings from `@sjvair/sdk`
2. **`monitorsManager`** (`src/lib/monitors/monitors.svelte.ts`) holds all reactive monitor state and runs a 2-minute auto-update interval
3. **`MonitorsMapIntegration`** (`monitors-map-integration.svelte.ts`) is a `MapGeoJSONIntegration` subclass that derives GeoJSON features from its injected `MonitorsDataSource` (default: `monitorsManager`) via `$derived.by()`
4. **`MonitorsIconManager`** generates and caches colored SVG icons (circle/square/triangle) keyed by color, also driven by an injected `MonitorsDataSource`'s `levels`

Pollutant **None** is not a `monitorsManager.pollutant` value: it disables `monitorsMapIntegration` (URL `?pollutant=none`); see `src/lib/options/pollutant-param.ts`. The pollutant↔URL (`?pollutant=`) sync lives in `MonitorMapLayout`; the refetch when the pollutant changes after the initial load lives in `monitorsManager` itself, so any host changing `monitorsManager.pollutant` gets it.

### `MonitorsDataSource`: reusing the monitors map display with different data

`MonitorsMapIntegration` and `MonitorShapeIconManager` (the base class behind
`MonitorsIconManager` and `CollocationIconManager`) don't hardcode `monitorsManager` —
they take a `MonitorsDataSource` (`{ meta, pollutant, latest, levels }`, exported from
`./monitors/types`) via their constructor, defaulting to `monitorsManager` when omitted.
`monitorsManager` is the **live** implementation (auto-polling current readings); a host
app can supply its own implementation of the same shape — e.g. one backed by historical
summaries averaged over a date range instead of live readings — and construct
`new MonitorsMapIntegration(myDataSource)` to reuse all of the clustering, icon
rendering, filtering, and tooltip/click-handling logic against that different data,
without forking any of it. This mirrors the `MapShell` split above: extract the
generic primitive, keep the existing singleton as the default/live convenience
instance.

### Svelte 5 Runes & State

The codebase uses Svelte 5 runes exclusively:

- `$state` / `$state.raw` for reactive state
- `$derived` / `$derived.by()` for computed values
- `$effect` for side effects (e.g., icon regeneration)
- Svelte 5 **attachment API** used for DOM lifecycle (see `Menu.svelte`)

### Key Libraries

| Library                    | Purpose                                |
| -------------------------- | -------------------------------------- |
| `sv-router`                | Client-side routing                    |
| `@maptiler/sdk`            | Map rendering                          |
| `@maptiler/weather`        | Wind layer                             |
| `@sjvair/sdk`              | Air quality data API                   |
| `@tstk/builtin-extensions` | `XMap`, custom collections             |
| `@tstk/decorators`         | `@Singleton` decorator                 |
| `@tstk/utils`              | `Interval`, `cast` utilities           |
| `color2k`                  | Color manipulation for icon generation |

### Environment Variables

```
VITE_MAPTILER_KEY=
VITE_NREL_KEY=
VITE_OPENWEATHERMAP_KEY=
```

### Package entries

`package.json` `exports` has three entries, all built by `svelte-package` into `dist/lib`:

- `.` (`src/lib/index.ts`) — everything; its `monitorMapRoutes` (`src/lib/routes.ts`) is
  eager. The widget build uses this.
- `./core` (`src/lib/core.ts`) — router context and `monitorsManager` only. Nothing it
  imports may reach `@maptiler/sdk`, `@maptiler/weather` or `uplot` at runtime.
- `./routes` (`src/lib/lazy-routes.ts`) — `monitorMapRoutes` with a lazy layout and lazy
  routes. Each must stay a literal `() => import("./X.svelte")`: sv-router detects lazy
  components by regex on the function source.

`core.ts` and `lazy-routes.ts` are pure re-exports/route tables of the modules `.` uses, so
the singletons stay single across entries. `npm run test:bundle`
(`tests/bundle/check-bundle.mjs`) bundles both entries from `dist/lib` and fails if maplibre,
maptiler or uplot is reachable without a dynamic import, if an `exports` target is missing,
or if a lazy route is not a literal `() => import(...)`; the release workflow runs it before
publishing.

### `monitorsManager.init()` rules

`init()` is safe to call from several places. Overlapping calls share one promise; a
rejection clears it so a later call retries. An explicit `"pm25"`/`"o3"` wins over a call
without one regardless of order, and the most recent of two explicit values wins; if one
arrives mid-run the run refetches the latest readings before setting `initialized`. The
latest readings are requested in parallel with the list (chained off meta when no pollutant
was given). Once initialized, `init()` is a no-op and `MonitorMapLayout`'s URL effect
applies pollutant changes. `MonitorMapLayout` stops polling on destroy and calls
`monitorsManager.resumeAutoUpdate()` on mount, which refreshes once and restarts polling
only if it was stopped.

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
  `@source "../node_modules/@sjvair/monitor-map/dist/lib";`).

If you touch `vite.config.lib.ts` — it no longer exists; don't recreate it.

## Releases and publishing — standing restriction

Publishing to npm happens via `.github/workflows/release-package.yml`, triggered by a
GitHub Release being published. NEVER create a GitHub release, run `npm publish`, or
otherwise trigger this workflow without the user's explicit permission for that
specific release — every single time. Approval for one release does not carry forward
to the next, even later in the same session or as the natural next step of a task
already in progress (e.g. bumping a dependency and then "finishing" by releasing it).
Always stop and ask first, and wait for an explicit yes.

## Known issues

- **Stale cluster layers when toggling clustering during startup:** if Marker
  Clusters is toggled while the first `icons.loadIcons()` is still pending, the
  pending clustered `renderer.apply` in `MonitorsMapIntegration` /
  `EvStationsMapIntegration` still fires afterwards, leaving cluster layers next
  to the unclustered layer until the next toggle. Fix: re-check `this.clustered`
  and `this.enabled` (or a generation token) inside the `loadIcons().then(...)`.
- **`mapManager.styleLoading` has no recovery path:** it's set before
  `setStyle()` in `mapStyleState` and only cleared on `style.load`. If a basemap
  fails to load, every integration's base effect stays inert (layer toggles do
  nothing) until a later style change succeeds. Fix: also clear it on the map's
  `error` event (and/or a timeout), then call `integrationsManager.refresh()`.
- **Escape doesn't close a keyboard-opened dropdown:** toolbar dropdowns also
  open via `md:group-has-[:focus-visible]/menu:block` in `OptionsMenu.svelte`,
  but Escape only clears the click-open state, so the dropdown stays visible
  while its trigger keeps focus. Fix: blur the focused element inside the menu
  on Escape (in `OptionsBar`'s keydown handler).
- **A data-only `monitorsManager.init()` starts polling:** `init()` always calls
  `autoUpdate.start()`, so a host that initializes the manager in the background
  without showing the map (sjvair-mobile, after My Air's first load) refetches
  the ~1 MB monitor list every 2 minutes until the map has been opened and
  closed once. Fix: an opt-out (e.g. `init(pollutant, { autoUpdate: false })`),
  with `MonitorMapLayout` starting the poll itself.
- **A rejected `monitorsManager.init()` leaves the load screen up:**
  `MonitorMapLayout` calls `init()` without handling a rejection, so a failed
  monitors request is an unhandled rejection and `ready` never becomes true.
  Fix: catch it in the layout, show an error state with a retry (a later
  `init()` call starts a fresh run).
- **Blank outlet on a cold deep link with the lazy routes entry:** with
  `@sjvair/monitor-map/routes`, the router outlet is empty until the layout
  chunk loads, because `LoadScreen` lives inside that chunk. Fix, if it ever
  shows: have the host warm the chunk with a dynamic import, or give hosts a
  light placeholder to render while it loads.
- **`monitorsManager`'s refetch effect is untested:** specs compile rune modules in
  server mode, so the constructor `$effect` that refetches when `pollutant` changes
  after init never runs in `tests/monitors/monitors-manager.test.ts`. Its dependence
  on `#runInit` assigning `pollutant` and `latest` before setting `initialized` last
  (otherwise init triggers a redundant refetch and blanks the map) is verified by
  reading only. Test-only gap; the shipped code is correct. Fix: run that spec
  client-compiled (a second Vitest project or per-file config with the browser
  resolve condition, tests wrapped in `$effect.root` + `flushSync`) and add two
  cases: init does not refetch, and a pollutant change after init refetches once.

## Code Style

- **Tabs** for indentation (not spaces)
- **Double quotes** for strings
- No trailing commas
- Print width: 100 characters
- Prettier + ESLint (flat config, v10); run `npm run format` before committing
- Tailwind CSS v4 for styling; prefer utility classes and arbitrary values (`grid-cols-[2fr_1fr]`) over custom `<style>` blocks
- Never give a component and a `.svelte.ts` module the same base name in one folder (`Foo.svelte` + `foo.svelte.ts`) — `./foo.svelte` matches the component on case-insensitive filesystems (macOS); import rune modules with their full extension (`./foo.svelte.js`)
- Svelte's `class:` directive cannot handle Tailwind arbitrary values with brackets or colons — for simple toggles use a `$derived` class string; for complex multi-property responsive rules use a `<style>` block with semantic class names and `class:name={condition}`
