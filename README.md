# @sjvair/monitor-map

SJVAir's interactive air quality monitor map, built with Svelte 5, Vite and
`@sjvair/map-sdk`. It ships two ways:

- **A code-split widget** (`npm run build`), embedded via a `<div id="SJVAirMonitorMap">`
  in a Django template on sjvair.com.
- **A component library** (`npm run build:lib`, published to npm as
  `@sjvair/monitor-map`), imported by the `sjvair-mobile` Capacitor app.

## Installation

```bash
npm install @sjvair/monitor-map "@sjvair/sdk@npm:@jsr/sjvair__sdk@^5.0.0-beta.10"
```

`@sjvair/sdk` (5.x) is a peer dependency, so the host and the map share one copy and the host's
`setOrigin` covers both. It is published on JSR, so the host's `.npmrc` needs
`@jsr:registry=https://npm.jsr.io` (and `allow-remote=root` on npm 12). `@sjvair/map-sdk` and
`@maptiler/sdk` are ordinary dependencies.

The 5.0 betas are on the `next` dist-tag: `npm install @sjvair/monitor-map@next`.

## Keys

The library reads no keys. Call `configureMonitorMap` once at startup, before the map or the EV
layer is used:

```ts
import { configureMonitorMap } from "@sjvair/monitor-map/core";

configureMonitorMap({ maptilerKey: "...", nrelKey: "..." });
```

## Usage

### Full-page map, via `sv-router`

The default integration path mounts a complete map (monitors, collocation sites,
wind, HMS smoke/fire, EV stations) as a route in a host app that
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

#### Who is logged in

The host page tells the map who is logged in through a global `USER` object
(`globalThis.USER`). The map only reads it, and reads two fields:

- `is_authenticated`: when truthy, the panel shows the alerts subscription control.
- `api_token`: sent with subscription requests when it is a non-empty string. Otherwise no
  token is sent and the request relies on the session cookie.

A host that sets `USER` once, before the map loads, needs nothing else. A host that changes it
while the map is showing (replacing the object or editing a field) calls
`monitorMapUserChanged()` afterwards, from `@sjvair/monitor-map` or `/core`, and an open panel
updates: the control disappears on logout, and appears or reloads on login or a user switch.
Call it from an event handler or an effect, never inside a `$derived`: it writes `$state`.

```ts
import { monitorMapUserChanged } from "@sjvair/monitor-map/core";

globalThis.USER = loggedOutUser;
monitorMapUserChanged();
```

Both fields stay as described here through 5.0.

### Cancelling requests

`monitorsManager.init()` takes `{ signal }` (an `AbortSignal`). Aborting rejects that call with
the signal's reason. The run is shared: aborting your signal stops only your wait, and the run
itself is cancelled only when every caller waiting on it has aborted. The panel, chart and
subscription status cancel their own superseded requests; that work resolves quietly.

## Migrating from 4.x

- **Keys:** pass the MapTiler and NREL keys with `configureMonitorMap({ maptilerKey, nrelKey })`
  (from `@sjvair/monitor-map` or `/core`). The library no longer reads them from the build
  environment.
- **`@sjvair/sdk` is a peer dependency** (`^5.0.0-beta.10` for the betas): install it in the host.
  `@sjvair/map-sdk` and `@maptiler/sdk` are ordinary dependencies; add neither.
- **Svelte `^5.57.0`:** the `svelte` peer range was `^5.0.0`.
- **`meta` is SDK 5.0's:** `meta.levels` is gone; read `meta.scale`.
- **`/routes`** is unchanged: `monitorMapRoutes` with the map at `/` and a monitor at
  `/monitor/:id`, lazy as before.
- **`/core`** keeps `provideMonitorMapRouter`, `useMonitorMapRouter`, `ROUTER_KEY`,
  `MonitorMapRouterApi` and `monitorsManager` (`init(pollutant?, { autoUpdate?, signal? })`,
  `initialized`, `meta`, `list`), and adds `configureMonitorMap`, `monitorMapConfig` and
  `monitorMapUserChanged`.
- **`USER`:** read as in 4.x (`is_authenticated` and `api_token`). New: a host that changes it
  while the map is showing calls `monitorMapUserChanged()` (see "Who is logged in").
- **Tailwind:** add `@source "../node_modules/@sjvair/map-sdk/dist";` and
  `@import "@sjvair/map-sdk/theme.css";` beside the existing monitor-map `@source`. The host
  defines the theme tokens map-sdk needs (`--background` to `--radius`, plus `--popover` and
  `--accent`).
- **Removed exports:** everything from `.` except `monitorMapRoutes`, the router context,
  `monitorsManager`, `configureMonitorMap` and `monitorMapConfig` (and their types). That includes
  `MapShell`, the options toolbar, the integration classes, `MonitorsDataSource` and the other
  managers.

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
npm run map-sdk:pack # Optional: pack ../map-sdk into vendor/ to try an unreleased map-sdk
```

`@sjvair/map-sdk` is the published npm version, pinned exactly in `package.json`. To try an
unreleased map-sdk, run `npm run map-sdk:pack`, then `npm install` the tarball path it prints;
do not commit that change.

## Publishing

Publishing to npm (`@sjvair/monitor-map`) happens via GitHub Actions
(`.github/workflows/release-package.yml`) whenever a GitHub Release is published (or the
workflow is triggered manually). The workflow runs `npm test` and `npm run test:bundle`
before publishing. Bump `version` in `package.json` before cutting the release. A version with a
`-` (such as `5.0.0-beta.0`) is published to the `next` dist-tag, not `latest`; mark its GitHub
Release as a pre-release.
