# @sjvair/monitor-map

SJVAir's interactive air quality monitor map, built with Svelte 5, Vite, and MapTiler
SDK. It ships two ways:

- **A code-split widget** (`npm run build`), embedded via a `<div id="SJVAirMonitorMap">`
  in a Django template on sjvair.com.
- **A component library** (`npm run build:lib`, published to npm as
  `@sjvair/monitor-map`), imported by the `sjvair-mobile` Capacitor app and by other SJVAir
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

This is what the sjvair.com widget uses, via `MonitorMapLayout` (the thin wrapper
`monitorMapRoutes` points to). `sjvair-mobile` mounts the same route tree through the
subpath entries described next, so the map stays off its startup path.

### Keeping the map off a host app's startup path

The package root re-exports everything, and its `monitorMapRoutes` imports the map layout
eagerly, so referencing it in a router puts maplibre (about 2 MB) in the startup bundle. A
host whose first screen is not the map uses the two subpath entries instead:

```ts
// router.ts
import { createRouter } from "sv-router";
import { monitorMapRoutes } from "@sjvair/monitor-map/routes";

export const { route, navigate, p, isActive, Router } = createRouter({
	"/my-map": monitorMapRoutes
});
```

```svelte
<!-- app root -->
<script>
	import { provideMonitorMapRouter } from "@sjvair/monitor-map/core";
	import { route, navigate, p, isActive, Router } from "./router";

	provideMonitorMapRouter({ route, navigate, p, isActive, basePath: "/my-map" });
</script>

<Router />
```

- `@sjvair/monitor-map/core` exports the router context (`provideMonitorMapRouter`,
  `useMonitorMapRouter`, `ROUTER_KEY`, `MonitorMapRouterApi`) and `monitorsManager`, with
  no map code behind them.
- `@sjvair/monitor-map/routes` exports a `monitorMapRoutes` with the same route tree, whose
  map layout and monitor panel load on demand. The load screen shows while they do, including
  on a cold deep link into the map, with a retry if a chunk fails to load.

Both entries share their modules with the package root, so `monitorsManager` is the same
instance whichever entry it is imported from.

`monitorsManager.init()` may be called from several places (for example, a background
preload and the map layout): overlapping calls share one set of requests, a failed call can
be retried, and an explicit `"pm25"`/`"o3"` argument wins over a call without one.

`init()` starts the 2-minute polling when it finishes. A background preload that shows no
map should pass `{ autoUpdate: false }` (`monitorsManager.init(undefined, { autoUpdate: false })`);
the map layout starts polling when it mounts. If any call sharing a run wants polling, it
starts.

### The monitor detail panel

`/monitor/:id` under the map's routes opens a panel for that monitor. It loads the monitor
itself, so a link works whatever pollutant the map is showing and needs no `?pollutant=`
parameter: the panel shows the map's pollutant when the monitor reports it and otherwise the
one it does report, saying so. An inactive monitor gets a panel with its past data and a
note that it has no current readings; an unknown id gets "Monitor not found."

### Cancelling requests

`monitorsManager.init()` and `update()`, `collocationSitesManager.init()` and `update()`,
`hmsManager.init()`, `loadSmoke()` and `loadFire()`, and `evStationsManager.loadLvl2Stations()`
and `loadLvl3Stations()` take `{ signal }` (an `AbortSignal`). Aborting rejects that call with
the signal's reason (a call that is a no-op, such as `update()` before init or `init()` once
initialized, resolves as before). The panel, chart and subscription status cancel their own superseded
requests when the selection changes; that work resolves quietly. A `monitorsManager.init()`
run is shared: aborting your signal stops only your wait, and the run itself is cancelled only
when every caller waiting on it has aborted.

A host that depends on `@sjvair/sdk` directly must use `^4.7.0`, so npm installs one copy. A
nested copy ignores the host's `setOrigin`.

### Embedding `MapShell` directly, with a reduced integration set

`MonitorMapLayout` is an opinionated wrapper around the lower-level `MapShell`
component: it wires up every integration, every manager, and the full options toolbar and
legend. A host that only wants some of that — say, just the monitors integration, with no
EV stations/wind/HMS — should compose `MapShell` directly instead:

```svelte
<script>
	import {
		MapShell,
		MonitorsMenu,
		OptionsGroup,
		PollutantMenu,
		monitorsMapIntegration,
		monitorsManager
	} from "@sjvair/monitor-map";

	let failed = $state(false);
	function load() {
		failed = false;
		monitorsManager.init().catch(() => (failed = true));
	}
	load();
</script>

<MapShell
	integrations={[monitorsMapIntegration]}
	ready={monitorsManager.initialized}
	panelOpen={false}
	routerEscapeHatch={false}
>
	{#snippet menu()}
		<OptionsGroup>
			<PollutantMenu />
			<MonitorsMenu />
		</OptionsGroup>
	{/snippet}
	{#snippet loadError()}
		{#if failed}
			<button onclick={load}>Couldn't load air monitors. Try again</button>
		{/if}
	{/snippet}
</MapShell>
```

The `menu` snippet renders inside the options toolbar; compose `OptionsGroup` with the
exported menus (`PollutantMenu`, `MonitorsMenu`, `LayersMenu`, `OverlaysMenu`,
`SettingsMenu`), or `OptionsMenu` with the row components for a custom data source. The
optional `loadError` snippet renders on the load screen, under the logo, which stays up
until `ready` is true; use it to show a failed initial load with a retry.

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
npm test             # Vitest (specs in tests/**)
npm run test:bundle  # build:lib, then check the light entries keep maplibre off the eager path
```

## Publishing

Publishing to npm (`@sjvair/monitor-map`) happens via GitHub Actions
(`.github/workflows/release-package.yml`) whenever a GitHub Release is published (or the
workflow is triggered manually). The workflow runs `npm test` and `npm run test:bundle`
before publishing. Bump `version` in `package.json` before cutting the release.
