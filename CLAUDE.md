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
```

No test framework is configured.

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

### Modularization: `MapShell` vs `MonitorMapLayout`

`MonitorMapLayout` (used by `monitorMapRoutes`) is a **thin, opinionated
wrapper** around `MapShell` that wires up every integration, every manager,
and the full display-options menu — this is what the widget build and
`v3-mobile` use today, unchanged.

`MapShell` is the **generic primitive** underneath it: it owns only layout
concerns that don't know which integrations exist (load screen, panel
resize/transition, the sv-router click escape-hatch) and takes
`integrations`, `ready`, `panelOpen`, `knownRoutes`, and `menu`/`overlays`/
`children` snippets as props. A host that wants a reduced feature set (e.g.
only the monitors integration, no EV stations/wind/HMS) should compose
`MapShell` directly instead of going through `monitorMapRoutes`/
`MonitorMapLayout` — see `src/lib/MonitorMapLayout.svelte` itself as the
reference example of how to wire a manager, an integration list, and menu/
overlay content into it.

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

Two consequences for any consuming app:

- It must configure its own bundler alias so a bare `$lib`/`$lib/*` import
  **originating from a file inside this package** resolves to this package's
  own `dist/lib`, not the host app's `$lib`/`src/lib` — a plain global alias
  string can't do this since it can't discriminate by importer. See
  `v3-mobile`'s `mobile.vite.config.ts` (`monitorMapLibAlias()`) for the
  reference implementation (a `resolveId` hook scoped by `importer` path).
- `LoadScreen.svelte` uses `<enhanced:img>`, which isn't valid HTML until the
  host app's own Vite config runs `@sveltejs/enhanced-img`'s `enhancedImages()`
  plugin — hence it's a `peerDependency`, not just a `devDependency` here.
  `enhancedImages()`'s internal path resolution goes through the same Vite
  `resolveId` chain as normal imports, so the scoped `$lib` alias above covers
  its `$lib`-prefixed image paths too — no separate fix needed for that.

If you touch `vite.config.lib.ts` — it no longer exists; don't recreate it.

## Code Style

- **Tabs** for indentation (not spaces)
- **Double quotes** for strings
- No trailing commas
- Print width: 100 characters
- Prettier + ESLint (flat config, v10); run `npm run format` before committing
- Tailwind CSS v4 for styling; prefer utility classes and arbitrary values (`grid-cols-[2fr_1fr]`) over custom `<style>` blocks
- Svelte's `class:` directive cannot handle Tailwind arbitrary values with brackets or colons — for simple toggles use a `$derived` class string; for complex multi-property responsive rules use a `<style>` block with semantic class names and `class:name={condition}`
