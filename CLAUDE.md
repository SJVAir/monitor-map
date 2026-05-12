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

### Monitor Data Flow

1. **`App.svelte`** calls `monitorsManager.init()` and `collocationSitesManager.init()` on mount, which fetch metadata, monitor list, and latest readings from `@sjvair/sdk`
2. **`monitorsManager`** (`src/lib/monitors/monitors.svelte.ts`) holds all reactive monitor state and runs a 2-minute auto-update interval
3. **`MonitorsMapIntegration`** (`monitors-map-integration.svelte.ts`) is a `MapGeoJSONIntegration` subclass that derives GeoJSON features from `monitorsManager` via `$derived.by()`
4. **`MonitorsIconManager`** generates and caches colored SVG icons (circle/square/triangle) keyed by color

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

## Code Style

- **Tabs** for indentation (not spaces)
- **Double quotes** for strings
- No trailing commas
- Print width: 100 characters
- Prettier + ESLint (flat config, v10); run `npm run format` before committing
- Tailwind CSS v4 for styling; prefer utility classes and arbitrary values (`grid-cols-[2fr_1fr]`) over custom `<style>` blocks
- Svelte's `class:` directive cannot handle Tailwind arbitrary values with brackets or colons — for simple toggles use a `$derived` class string; for complex multi-property responsive rules use a `<style>` block with semantic class names and `class:name={condition}`
