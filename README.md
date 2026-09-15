# @sjvair/monitor-map

SJVAir's interactive air quality monitor map, built with Svelte 5, Vite, and MapTiler
SDK. It ships two ways:

- **A code-split widget** (`npm run build`), embedded via a `<div id="SJVAirMonitorMap">`
  in a Django template on sjvair.com.
- **A component library** (`npm run build:lib`, published to npm as
  `@sjvair/monitor-map`), imported by the `v3-mobile` Capacitor app and by other SJVAir
  projects (e.g. `data-dashboard`) that want to embed the map or reuse its map-display
  logic against their own data.

## Installation

```bash
npm install @sjvair/monitor-map
```

## Usage

### Full-page map, via `sv-router`

The default integration path mounts a complete map (all integrations: monitors,
collocation sites, wind, HMS smoke/fire, EV stations) as a route in a host app that
uses `sv-router`:

```ts
// router.ts
import { createRouter } from "sv-router";
import { monitorMapRoutes } from "@sjvair/monitor-map";

export const { route, navigate, p, isActive, Router } = createRouter({
	"/my-map": monitorMapRoutes
	// ...the host app's own routes
});
```

```svelte
<!-- app root -->
<script>
	import { provideMonitorMapRouter } from "@sjvair/monitor-map";
	import { route, navigate, p, isActive, Router } from "./router";

	provideMonitorMapRouter({ route, navigate, p, isActive, basePath: "/my-map" });
</script>

<Router />
```

This is what the sjvair.com widget and `v3-mobile` use today, via `MonitorMapLayout`
(the thin wrapper `monitorMapRoutes` points to).

### Embedding `MapShell` directly, with a reduced integration set

`MonitorMapLayout` is an opinionated wrapper around the lower-level `MapShell`
component: it wires up every integration, every manager, and the full display-options
menu. A host that only wants some of that — say, just the monitors integration, with no
EV stations/wind/HMS — should compose `MapShell` directly instead:

```svelte
<script>
	import { MapShell, monitorsMapIntegration, monitorsManager, Menu } from "@sjvair/monitor-map";

	monitorsManager.init();
</script>

<MapShell
	integrations={[monitorsMapIntegration]}
	ready={monitorsManager.initialized}
	panelOpen={false}
	routerEscapeHatch={false}
>
	{#snippet menu()}
		<Menu>
			<!-- display options for the integrations you included -->
		</Menu>
	{/snippet}
</MapShell>
```

See `src/lib/MonitorMapLayout.svelte` for the reference example of wiring a manager, an
integration list, and menu/overlay content into `MapShell`.

**`routerEscapeHatch`**: `MapShell` defaults to `routerEscapeHatch={true}`, which
intercepts clicks and forces full-page navigation for links outside the map's own
routes — correct for a full-page map, wrong for a map embedded alongside a host app's
own navigation. A host with its own routing (like `data-dashboard`) **must** pass
`routerEscapeHatch={false}`, which also skips `useMonitorMapRouter()` entirely, so no
`provideMonitorMapRouter(...)` ancestor is required. Pass `basePath` if you need the
escape-hatch's "known route" prefix without going through `provideMonitorMapRouter`.

Mount at most one `MapShell` per app instance — its underlying map/load-screen/
integration-registration state is module-level singleton state shared across the whole
page.

## Extending

### Adding a new map feature

Map features are a plugin system built on a few abstract base classes, exported from the
package root:

- `MapIntegration` — base apply/remove lifecycle
- `MapLayerIntegration` — adds MapTiler layer management
- `MapGeoJSONIntegration` — adds GeoJSON data-source management, plus a
  `MapIconManager` for sprite icons (this is `src/lib/map/integrations/
map-geojson-integration.svelte.ts`'s `MapIconLayerIntegration`, exported under this
  name)

Extend one of these rather than manipulating the MapTiler map instance directly. Look
at `src/lib/monitors/monitors-map-integration.svelte.ts` or `src/lib/wind/wind.svelte.ts`
as reference implementations.

### Reusing the monitors map display with different data (`MonitorsDataSource`)

`MonitorsMapIntegration` (and the icon-generation base class behind
`MonitorsIconManager`/`CollocationIconManager`) don't hardcode the live `monitorsManager`
singleton — they accept a `MonitorsDataSource` via their constructor:

```ts
export interface MonitorsDataSource {
	readonly meta: MonitorsMeta | null;
	readonly pollutant: "pm25" | "o3" | null;
	readonly latest: XMap<string, MonitorLatestType<"pm25" | "o3">> | null;
	readonly levels: Array<SJVAirEntryLevel> | null;
}
```

`monitorsManager` (auto-polling, always-current readings) is the default when no data
source is given, so existing consumers are unaffected. A host app that wants the same
clustering/icon-rendering/filtering/tooltip logic driven by different data — for
example, `data-dashboard`'s Monitors tab, which colors monitors by the **average of
historical summary data over a selected date range** rather than a live reading —
implements its own `MonitorsDataSource` (no polling, populated from
`getMonitorSummariesDaily`/etc.) and constructs its own instance:

```ts
import { MonitorsMapIntegration, type MonitorsDataSource } from "@sjvair/monitor-map";

const myDataSource: MonitorsDataSource = /* ... */;
const monitorsMapIntegration = new MonitorsMapIntegration(myDataSource);
```

This reuses all of the existing map-rendering work instead of forking it — see
`CLAUDE.md`'s "Monitor Data Flow" section for more detail.

## Development

```bash
npm run dev          # Start development server
npm run build        # Widget build (vite build, code-split ES modules)
npm run build:lib    # Library build (svelte-package), what gets published to npm
npm run preview      # Preview widget build
npm run check        # Type-check Svelte components
npm run check:watch  # Type-check in watch mode
npm run lint         # Prettier check + ESLint
npm run format       # Auto-format with Prettier
```

No test framework is currently configured.

## Publishing

Publishing to npm (`@sjvair/monitor-map`) happens via GitHub Actions
(`.github/workflows/release-package.yml`) whenever a GitHub Release is published (or the
workflow is triggered manually). Bump `version` in `package.json` before cutting the
release.
