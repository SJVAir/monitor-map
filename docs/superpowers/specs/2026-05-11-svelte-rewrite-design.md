# SvelteKit → Plain Svelte Rewrite Design

**Date:** 2026-05-11
**Status:** Approved

## Overview

Rewrite the project from SvelteKit to plain Svelte 5 + Vite + sv-router. The SvelteKit layer is already paper-thin (SSR off, prerender off, two near-empty route files) — removing it gives full control over the build and aligns cleanly with two distinct consumers: the Django embed widget and the Capacitor mobile app.

Goals:

- Build a self-contained ES module bundle for embedding in a Django HTML template (mounts to `<div id="SJVAirMonitorMap">`)
- Export `src/lib/` as a Svelte component library consumed directly by the Capacitor mobile app
- Add routing for a monitor detail panel (`/monitor/:id`) that slides in alongside the persistent map

---

## 1. Project Structure

`src/lib/` is completely unchanged. The SvelteKit wrapper is replaced:

```
src/
  routes/              ← deleted
    +layout.svelte
    +layout.ts
    +page.svelte
  app.html             ← becomes index.html at project root
  app.css              ← unchanged, imported by App.svelte
  app.d.ts             ← unchanged
  main.ts              ← NEW: mounts App.svelte to #SJVAirMonitorMap
  App.svelte           ← NEW: absorbs +page.svelte and +layout.svelte
  lib/                 ← completely unchanged
    ...
```

`main.ts`:

```ts
import App from "./App.svelte";
import { mount } from "svelte";

mount(App, { target: document.getElementById("SJVAirMonitorMap")! });
```

`App.svelte` is the persistent shell — the map never unmounts regardless of route.

---

## 2. Build Configuration

Two Vite configs, two build targets.

### `vite.config.ts` — Django widget (dev + ES module bundle)

- Entry: `src/main.ts`
- Output: ES module with code splitting enabled
- All dependencies bundled (MapTiler SDK, @sjvair/sdk, etc.)
- Output dir: `dist/`
- Django template: `<script type="module" src="monitor-map.js">`
- MapTiler SDK, app core, and monitor detail panel land in separate chunks for better browser caching

### `vite.config.lib.ts` — Svelte component library

- Entry: `src/lib/index.ts`
- Output: ES module, Svelte marked as external
- `.svelte` files preserved as-is for downstream Vite builds
- Output dir: `dist/lib/`
- Used for eventual npm publishing; Capacitor consumes source directly in the interim

### `package.json` scripts

```json
"dev":       "vite dev",
"build":     "vite build",
"build:lib": "vite build --config vite.config.lib.ts",
"check":     "svelte-check --tsconfig ./tsconfig.json",
"check:watch": "svelte-check --tsconfig ./tsconfig.json --watch",
"format":    "prettier --write .",
"lint":      "prettier --check . && eslint ."
```

Removed: `prepare`, `prepack`. Removed packages: `@sveltejs/kit`, `@sveltejs/adapter-auto`, `@sveltejs/adapter-static`, `@sveltejs/package`, `publint`.

---

## 3. Routing & Monitor Detail Panel

sv-router manages two routes. The map is always mounted — routing controls whether the detail panel is visible.

### Routes

```
/                  → map only
/monitor/:id       → map + monitor detail panel
```

### App.svelte layout

```svelte
<div class="app">
	<LoadScreen />
	<Map {integrations} />
	<Menu>...</Menu>
	<RouterOutlet />
</div>
```

The `RouterOutlet` for `/monitor/:id` renders `MonitorDetailPanel.svelte`, which is **lazily imported** (route-level dynamic import, produces a separate code-split chunk):

```ts
const routes = [
	{ path: "/", component: null },
	{
		path: "/monitor/:id",
		component: () => import("./MonitorDetailPanel.svelte")
	}
];
```

### Panel layout

The app shell is a CSS grid. When the panel opens, the grid animates to split:

```
Desktop:  [ map 67% ] [ panel 33% ]   ← panel slides in from right
Mobile:   [   map   ]                 ← panel slides up from bottom
          [  panel  ]
```

Closing the panel navigates back to `/`.

### Map resize

MapTiler requires `map.resize()` whenever its container dimensions change. A `$effect` in `App.svelte` watches the current route and calls `mapManager.map.resize()` after the CSS transition completes (delay matches transition duration).

---

## 4. Library Export for Capacitor

The Capacitor mobile app links this repo as a local workspace package:

```json
"dependencies": {
  "@sjvair/monitor-map": "file:../v3-monitor-map"
}
```

`src/lib/index.ts` (currently empty) is populated with explicit exports:

```ts
// State managers
export { monitorsManager } from "./monitors/monitors.svelte";
export { collocationSitesManager } from "./collocation-sites/collocations.svelte";
export { mapManager } from "./map/map.svelte";

// Components
export { default as Map } from "./map/Map.svelte";
export { default as Menu } from "./map/Menu.svelte";
// ... additional components as needed

// Types
export type * from "./monitors/types";
export type * from "./collocation-sites/types";
```

The Capacitor app composes its own screens using these shared components with its own sv-router instance for mobile-specific routes (notifications, camera, etc.).

---

## 5. What Stays the Same

- All of `src/lib/` — zero changes to monitors, collocation sites, map integrations, icon managers, or components
- Svelte 5 runes patterns (`$state`, `$derived`, `$effect`)
- The integration plugin system (`MapIntegration`, `MapLayerIntegration`, `MapGeoJSONIntegration`)
- MapTiler SDK usage
- Tailwind CSS + app.css
- ESLint + Prettier config
- TypeScript config (minor path alias updates for `$lib`)

---

## Open Questions

- Confirm exact npm package name for sv-router and verify API for lazy route registration before implementation.
