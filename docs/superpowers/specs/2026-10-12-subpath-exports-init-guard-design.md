# Light and lazy entry points, and a guarded `monitorsManager.init()`

Date: 2026-10-12
Target release: 4.1.0 (minor)
Branch: `feat/subpath-exports-init-guard`

## Goal

Let a host app load `@sjvair/monitor-map` cheaply at startup, and make
`monitorsManager.init()` safe to call from more than one place.

The motivating consumer is the mobile app (`../mobile`). Its landing screen, My Air, uses
none of the map, yet a ~2.2 MB chunk containing maplibre sits on its startup path
(~2.5 MB of startup JS in total). It also calls `monitorsManager.init()` in the background
while `MonitorMapLayout` calls it again when the map opens.

Success means:

- A host can import the router context and `monitorsManager` at startup, and reference the
  map's routes in its router, without maplibre in any statically imported chunk.
- Overlapping `init()` calls make one set of requests and agree on the pollutant.
- The `.` entry and the sjvair.com widget build behave exactly as they do in 4.0.3.

## Findings this design rests on

- `router-context.ts` and `monitors/monitors.svelte.ts` are already free of maplibre. Their
  runtime imports are `svelte`, `@sjvair/sdk`, `@tstk/builtin-extensions` and `@tstk/utils`.
  `monitors/types.ts` references `@maptiler/sdk` as a type only.
- The eager `monitorMapRoutes` in `routes.ts` is the only thing that pulls the map in: it
  statically imports `MonitorMapLayout.svelte`. Bundled from `src/lib`, an entry with the
  two light modules is 21 KB; with all-lazy routes added it is 60 KB, and the map moves to
  a 2.04 MB layout chunk and a 205 KB detail-panel chunk.
- sv-router 0.19 accepts a lazy `layout` (`LayoutComponent` is `RouteComponent`). It
  resolves layouts and the matched route together before swapping, so the previous screen
  stays up until the chunk arrives. It detects lazy components by regex on the function
  source, so each must be a literal `() => import("./X.svelte")`.
- `Interval.start()` is a no-op when the interval is already active, so a double init does
  not create two timers. It does fetch the list, meta and latest readings twice, and the
  call that finishes last decides `pollutant`.
- `MonitorMapLayout` stops `autoUpdate` in `onDestroy`, and nothing restarts it once the
  manager is initialized. A host that unmounts the layout (the mobile app, on leaving the
  map tab) loses live updates for the rest of the session.
- sjvair.com does not use the npm package. It clones this repo and runs the widget build,
  which goes through `src/router.ts` and `./lib`. The mobile app is the only npm consumer.
- `tests/` covers pure modules only; `vitest.config.ts` has no Svelte plugin. The release
  workflow publishes without running tests.

## Design

### 1. Subpath exports

Two new source files, both pure re-exports or route tables with no logic of their own.

`src/lib/core.ts`:

```ts
export {
	ROUTER_KEY,
	provideMonitorMapRouter,
	useMonitorMapRouter,
	type MonitorMapRouterApi
} from "./router-context";
export { monitorsManager } from "./monitors/monitors.svelte.js";
export type { MonitorsManager } from "./monitors/monitors.svelte.js";
export type { MonitorsDataSource, MonitorsPollutant } from "./monitors/types";
```

`src/lib/lazy-routes.ts`:

```ts
import type { Routes } from "sv-router";

// Each component must stay a literal `() => import(...)`: sv-router recognises lazy
// components by matching the function's source text.
export const monitorMapRoutes: Routes = {
	layout: () => import("./MonitorMapLayout.svelte"),
	"/": () => import("./MainMapView.svelte"),
	"/monitor/:id": () => import("./MonitorDetailPanel.svelte")
};
```

`package.json` `exports` gains two entries beside `.`:

```json
"./core": {
	"svelte": "./dist/lib/core.js",
	"types": "./dist/lib/core.d.ts",
	"default": "./dist/lib/core.js"
},
"./routes": {
	"svelte": "./dist/lib/lazy-routes.js",
	"types": "./dist/lib/lazy-routes.d.ts",
	"default": "./dist/lib/lazy-routes.js"
}
```

Rules:

- `.` is unchanged. `src/lib/routes.ts` and `index.ts`'s exports stay as they are, and
  `monitorMapRoutes` from `.` stays eager. The widget (`src/router.ts`) keeps using it:
  the map is the whole page there, so lazy routes would only add a request waterfall.
- `monitorMapRoutes` is eager from `.` and lazy from `./routes`. The doc comment in
  `index.ts` and the README say so.
- `core.ts` must never import anything that reaches `@maptiler/sdk`, `@maptiler/weather`
  or `uplot` at runtime. The bundle check in section 4 enforces this.
- Because both entries re-export the same files `.` uses, `monitorsManager` and
  `ROUTER_KEY` remain single instances no matter which entries a host mixes.

Host usage after this change:

```ts
// router.ts
import { monitorMapRoutes } from "@sjvair/monitor-map/routes";
// app root
import { provideMonitorMapRouter } from "@sjvair/monitor-map/core";
```

Known behavior of the lazy layout, accepted as is: on a cold deep link into the map the
router outlet is empty until the layout chunk loads, because `LoadScreen` lives inside that
chunk. After that, `ready={monitorsManager.initialized}` works as today. A host that wants
to avoid the gap can warm the chunk itself with a dynamic import.

### 2. `init()` in-flight guard

`MonitorsManager` gains two private fields: the in-flight promise and the requested
pollutant.

Behavior of `init(urlPollutant?)`:

1. If `initialized` is true, return a resolved promise. A later pollutant change is the
   layout's URL effect's job, as today.
2. If `urlPollutant` is `"pm25"` or `"o3"`, record it as the requested pollutant. Any other
   value, including `"none"` or `undefined`, records nothing.
3. If a run is in flight, return its promise. Otherwise start a run and return its promise.
4. When the run settles, clear the in-flight promise and the requested pollutant. After a
   rejection, the next `init()` call starts a fresh run.

Pollutant rule:

- An explicit pollutant wins over a call without one, whichever came first.
- If two explicit values conflict, the most recent one wins.
- With no explicit value, `meta.default_pollutant` is used.

The run:

1. Start `getMonitorsList()` and `getMonitorsMeta()` together.
2. Start the latest-readings request without waiting for the list: for the requested
   pollutant if one is recorded, otherwise chained off the meta request using
   `default_pollutant`. Remember which pollutant it was made for.
3. Assign `list` and `meta` as soon as both have arrived.
4. Await all of the above with a single `Promise.all`, so a failure in one never leaves
   another as an unhandled rejection.
5. Re-read the wanted pollutant (requested, else default). While it differs from the one
   the latest readings were fetched for, fetch again for the wanted one. This covers an
   explicit pollutant that arrived mid-run.
6. Assign `pollutant` and `latest`, call `autoUpdate.start()`, then set `initialized`.

`initialized` is still set last, so the constructor's refetch effect sees a consistent
state and does not fire for the initial load.

`init()` still starts polling for every caller, including a data-only host. That is
unchanged from 4.0.3 and deliberately left alone in this release.

### 3. Resume live updates when the layout remounts

`MonitorsManager` gains `resumeAutoUpdate()`: if the manager is initialized and
`autoUpdate` is not active, it calls `update()` once and then `autoUpdate.start()`;
otherwise it does nothing. `MonitorMapLayout.svelte` calls it right after the existing
`monitorsManager.init(...)` call. The logic lives on the manager rather than in the layout
so it can be unit tested.

- Not active means an earlier layout instance stopped it, so the data may be stale; the
  immediate `update()` refreshes it instead of waiting two minutes.
- If polling is already active (a host initialized the manager in the background), nothing
  extra is fetched.
- The existing `onDestroy` stop stays.

### 4. Tests

Unit tests, `tests/monitors/monitors-manager.test.ts`:

- `vitest.config.ts` gains the Svelte plugin so the rune module compiles. `@sjvair/sdk` is
  mocked with controllable promises; the module is re-imported fresh per test.
- Cases:
  - Two overlapping `init()` calls make one list, one meta and one latest request, call
    `autoUpdate.start()` once, and resolve together.
  - `init()` then `init("o3")` while in flight ends with pollutant `"o3"` and latest
    readings for `"o3"`.
  - `init("o3")` then `init()` ends with `"o3"`.
  - `init("pm25")` then `init("o3")` ends with `"o3"`.
  - An explicit pollutant arriving after the default's latest readings were requested
    triggers exactly one extra latest request, and `initialized` is set only after it.
  - With an explicit pollutant, the latest request starts before the list resolves.
  - A rejected run leaves `initialized` false, and a following `init()` makes new requests
    and succeeds.
  - `init()` after initialization makes no requests.

Bundle check, `npm run test:bundle`:

- Runs `build:lib`, then a Node script (`tests/bundle/check-bundle.mjs`) that uses Vite's
  build API to bundle two fixtures importing from `dist/lib`: one importing `core.js`, one
  importing `core.js` and `lazy-routes.js`.
- Asserts that neither entry chunk, nor any chunk it imports statically, contains
  `maplibre`.
- Asserts that some lazily loaded chunk of the second fixture does contain `maplibre`, so
  the check is known to be able to detect it.
- Kept out of `npm test` because it needs a build and takes much longer than the unit
  tests.

Release workflow (`.github/workflows/release-package.yml`): add `npm test` and
`npm run test:bundle` before `npm publish`. `test:bundle` already runs `build:lib`, so the
separate `build:lib` step is replaced by it.

### 5. Docs

- `index.ts` usage comment and README: show the `./core` and `./routes` entries and state
  the eager/lazy difference.
- `CLAUDE.md`: document the two entries, the `core.ts` no-map rule, the init guard and
  pollutant rule, `test:bundle`, and the new test file.

## Separate PR in the same release: case-collision rename

Branch `fix/map-module-case-collision`, its own PR, merged before the 4.1.0 bump.

- Rename `src/lib/map/map.svelte.ts` to `map-manager.svelte.ts` and update its ~19
  importers, using the full `./map-manager.svelte.js` extension per the code-style rule.
- Non-breaking: `exports` blocks deep imports, and `index.ts` keeps exporting the same
  names.
- Remove the matching bullet from `CLAUDE.md`'s Known issues.
- The mobile app drops `monitorMapCaseFix()` as part of the downstream change.

## Versioning and release notes

4.1.0: additive exports plus fixes, nothing removed or changed on `.`. The feature PR
carries the version bump commit. Publishing happens only with explicit approval for that
release.

Draft release notes:

> Light and lazy entry points, and a safe `monitorsManager.init()`.
>
> ## Changes
> - **`@sjvair/monitor-map/core`:** the router context and `monitorsManager` without the
>   map, for use at host-app startup.
> - **`@sjvair/monitor-map/routes`:** `monitorMapRoutes` with a lazy layout and lazy route
>   components, so a host router can reference it without loading maplibre.
> - **`monitorsManager.init()`:** overlapping calls share one request; a failed init can be
>   retried; an explicit pollutant wins over a call without one; the latest readings load
>   in parallel with the monitor list.
> - **Bug fixes:**
>   - Live updates resume when the map is reopened after being closed.
>   - The package builds on case-insensitive filesystems (macOS) without a resolver
>     workaround.
> - **Tooling:** the release workflow runs the unit tests and a bundle check before
>   publishing.
>
> The `.` entry is unchanged.

## Out of scope

- Whether a data-only `init()` should start polling (an opt-out is a possible follow-up).
- `MonitorMapLayout` not handling a rejected `init()`: the load screen stays up. Existing
  behavior, unchanged.
- The other Known issues in `CLAUDE.md`.
- Any edit to the mobile app. That is a separate proposal after 4.1.0 is published.
