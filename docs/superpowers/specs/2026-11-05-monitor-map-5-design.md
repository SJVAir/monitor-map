# monitor-map 5.0: rebuilt on map-sdk

Date: 2026-11-05. Status: **approved by the user 2026-11-05.**
Release 1, step 5, part 2 (data-dashboard `ROADMAP.md` item 5, `TODO.md` → "Release 1, step 5").
Builds on map-sdk milestone 2 (`../map-sdk/docs/superpowers/specs/2026-11-04-map-sdk-milestone-2-design.md`,
merged as map-sdk #4, `main` at a897dbc). That spec's "What monitor-map builds on top" is the
checklist this rebuild covers.

## Intent

monitor-map is the live map on sjvair.com and the map tab in the mobile app. 5.0 rebuilds it on
`@sjvair/map-sdk`, so one map library serves sjvair.com, the app and the dashboard's Map widget,
and the old integration system (`mapManager`, `IntegrationsManager`, the integration classes)
goes away.

**The user's goal (2026-11-04): monitor-map 5.0 should "pretty much function and look the same
as it currently does".** A visitor to sjvair.com or the app should not notice the change, apart
from the bug fixes and accessibility additions listed below.

**Why now:** the user decided (2026-11-04) that the updated mobile app and sjvair.com `develop`
are released on the same day. Before then, map-sdk is on the latest `@sjvair/sdk` 5.0 beta,
monitor-map is rebuilt on map-sdk as 5.0, and mobile is on that monitor-map. sjvair.com `develop`
drops `levels` from `monitors/meta/` (#306), so monitor-map 4.x can't run against it: 5.0 is on
the go-live path. The mobile migration onto 5.0 is a later session; this spec should make it
straightforward.

## Decisions

The user's, with dates:

- **The parity rule (2026-11-04).** Match today's map (monitor-map 4.3.0) exactly, except where
  map-sdk's version fixes a bug or is there for accessibility; those stay as map-sdk does them
  (milestone 2 spec, "What stays map-sdk's"). When a difference doesn't fit cleanly, ask the user.
- **What stays in monitor-map (2026-11-04):** wind on `@maptiler/weather` as a host custom layer
  in map-sdk's draw order, and EV chargers from NREL. The NREL key moves into injected config.
  The EV ZIP list is cleaned up. The 5 mountain counties (Calaveras, Tuolumne, Mariposa, Mono,
  Inyo) stay in the EV area on purpose.
- **MIT license** for the rebuild (decided 2026-09-24, data-dashboard `ROADMAP.md` item 5).
- **Branches (2026-11-05).** A `release/5.0.0` branch from `origin/main`. All 5.0 work merges into
  it through PRs; it merges into `main` once 5.0.0 is ready, on go-live day. Every merge, into
  either branch, needs the user's yes.
- **Mobile tries 5.0 through npm betas (2026-11-05)** published from `release/5.0.0`
  (`5.0.0-beta.N`, npm dist-tag `next`). Each beta needs the user's yes, and map-sdk must be on
  npm first.
- **The chart's days are Pacific days (2026-11-05),** using `@sjvair/sdk`'s `startOfPacificDay`,
  `endOfPacificDay` and `addPacificDays`. This settles `DEFERRED.md`'s "Shared date-range helper
  home": no new shared module anywhere. Viewers in the Valley see no change; viewers in another
  time zone get Pacific days (a fix under the parity rule).
- **The three `monitor-map:` entries in `DEFERRED.md` (2026-11-05):** fix "chart stuck loading
  after a failed background refresh" and "subscription status load errors are unhandled" in 5.0;
  close "cancelling one-off loads", since smoke, fire and collocation data move to map-sdk's
  load-once stores, which already handle a caller's cancel (see "Deferral register").
- **The "Known issues" in `CLAUDE.md` (2026-11-05):** all six are handled in 5.0 (see "Fixes
  folded in"). For a monitor with no current readings, the widget link is hidden; the subscribe
  button and the temperature stay.
- **The main entry shrinks (2026-11-05).** No host needs `MapShell`, the menus or the
  integration classes now that map-sdk exists: mobile imports only `provideMonitorMapRouter`,
  `monitorsManager` and `monitorMapRoutes`, and the dashboard doesn't depend on monitor-map.
- **EV ZIP list (2026-11-05):** the user scraped it from a website; check it and fix errors (see
  "EV chargers").
- **The List button (2026-11-05):** top right, below the map's zoom, compass and locate-me
  buttons, shown only on keyboard focus. EV stations are in the list.
- **Parity check (2026-11-05):** a comparison page of paired screenshots (5.0 on the local stack
  beside the public sjvair.com map) that the user reviews. Playwright drives both; the user can
  put Chrome in focus on request for hands-on checks.

## Goals

1. monitor-map 5.0 looks and behaves like 4.3.0 under the parity rule, on sjvair.com (the
   standalone widget) and in the mobile app (`/core`, `/routes`).
2. Everything map-related runs on map-sdk's plugins, stores and `MapView`; monitor-map's own map
   code is limited to wind, EV chargers, the search pin and the EV popup.
3. monitor-map runs on `@sjvair/sdk` 5.0 (`scale`, not `levels`).
4. Mobile's migration is a short, listed set of changes (see "What changes for consumers").
5. sjvair.com's deploy needs no change: same build command, same output files.

## Non-goals

- The mobile migration itself (its own session and plan, after 5.0 betas exist).
- The dashboard's Map widget, the family-palette restyle, translation, and wind from open data.
- Changing map-sdk, mobile, sdk-js, sjvair.com or the dashboard. What monitor-map needs from
  them goes to the coordinator (`data-dashboard-b7`) or that repo's session.
- A dark UI. Today's map has none (the `.dark` CSS in `app.css` is never switched on).

## Anti-goals: it fails if…

- a visitor notices the map changed, other than the listed fixes and accessibility additions;
- `main` changes before go-live day, or anything is published, tagged or merged without the
  user's yes for that specific action;
- sjvair.com's `scripts/import-monitor-map.sh` or `camp/templates/pages/index.html` would need a
  change;
- the `/core` entry reaches the map engine (`@maptiler/sdk`, maplibre, `@maptiler/weather`,
  uPlot) at startup;
- a key is hardcoded, printed or committed;
- monitor-map works around a map-sdk gap with CSS overrides or by reaching into its internals
  instead of asking for the change.

## Constraints

- **map-sdk is unpublished** (`0.1.0-dev.0`; `@sjvair/map-sdk` is a 404 on npm). Development uses
  a local link to `../map-sdk`. Anything that installs from scratch needs it on npm: a CI job,
  the release workflow, a monitor-map beta, mobile, and sjvair.com's deploy once `release/5.0.0`
  is on `main`. The first point the plan needs a published map-sdk is the first monitor-map beta
  (or PR CI, whichever comes first); tell the coordinator then. A plain `file:../map-sdk` link
  resolves `svelte` and `@maptiler/sdk` from `../map-sdk/node_modules`, giving two copies of
  each; development installs a packed tarball (`npm pack` in map-sdk) or dedupes them in Vite.
- **map-sdk changes this rebuild needs land in map-sdk before the first monitor-map beta,** so
  no beta ships with a stopgap (the List button under the toolbar, or the feature list turned
  off). They can land before map-sdk's first publish (the coordinator, 2026-11-05). Each map-sdk publish needs the
  user's yes and a one-time npm trusted-publisher setup.
- **`@maptiler/sdk` is pinned `~4.2.0` by map-sdk** (its `GlMap` depends on 4.2 internals).
  monitor-map's `@maptiler/sdk` must resolve to the same copy, so `WindLayer` (a MapLibre custom
  layer), `Marker` and `Popup` come from the map engine map-sdk drives. `@maptiler/weather` must
  be a version compatible with 4.2.
- **`@sjvair/sdk` 5.0:** pin the latest 5.0 beta exactly for development (`5.0.0-beta.3` today).
  `levels`, `SJVAirEntryLevel`, `sjvairEntryLevelMetaSchema` and `EntriesMeta.asIter` are gone;
  `getHMSSmoke`/`getHMSFire` take `(query?, options?)`.
- **Local data is incomplete** (the stack runs about 8 hours a day; missed jobs aren't re-run, and
  the local `.env` relaxes monitor health). Rule that out before calling something a bug. Compare
  looks against the public sjvair.com map, and data against the local stack.
- **Nothing touches production.** The public sjvair.com map may be viewed read-only, as the
  "today's look" reference.
- Repo rules from `CLAUDE.md` still hold (code style, Tailwind utilities, no component and rune
  module with the same base name, no AI attribution).

## What the rebuild looks like

### What goes

`mapManager`, `Map.svelte`, `map-style-state`, `IntegrationsManager`, `ClickManager`,
`TooltipManager`, the integration base classes, `baseLayerSeperator`, every
`*-map-integration`, the icon managers, the cluster renderers, `collocationSitesManager`,
`hmsManager`, the monitor/cluster/collocation tooltips, the legend bar and legend data, and the
`MonitorsDataSource` abstraction. map-sdk's `createMap`, plugins, presets, stores, tooltips and
`Legend` replace them. `@tstk/*`, `@turf/*` and `date-fns` stay only if something left uses them.

### The map

One `MapContext` from `createMap()`, configured like the map-sdk demo's "Live map" section:

- initial view center `[-119.7987626619462, 36.76272050981146]`, zoom 7; `projection: "globe"`;
  `space: { preset: "milkyway" }`;
- `basemaps: { ...defaultBasemaps(), excludedLayers: [] }` (today shows the basemap's shop, food,
  tourism and transport places), extended to today's basemap list: every MapTiler style, the
  highest `_V<n>` per name, sorted by name (`src/lib/map/utils.ts`), each with its variants.
  Switching basemap keeps the variant type when the new basemap has it (`src/lib/map/basemap.ts`);
- `MapView` with `controls="engine"` (MapTiler's zoom, compass and locate-me, as today),
  `selectionBar={false}`, `tooltip="pointer"`, and the feature list on (accessibility), with its
  List button **at the top right, below the engine's controls, and shown only on keyboard focus**
  (the user, 2026-11-05): hidden until Tab reaches it, like a skip link, so mouse and touch users
  see today's map and screen readers still reach it. Both are new map-sdk options (see
  "Dependencies on other repos");
- a monitor click (and a pick from the feature list) navigates to `/monitor/:id` and eases to
  `minZoom: 12`; the selected monitor uses `selectedStyle: "enlarge"` and `selectionMode:
  "single"`. Closing the panel clears the selection.
- Whether `projection` and `space` survive a basemap switch is unverified (map-sdk passes them
  only to the constructor); the plan checks it early, and a gap goes to map-sdk.

**Plugins, bottom to top:** wind, HMS smoke, HMS fire, collocation sites, monitors, EV chargers
(today's order). Turning a layer on adds its plugin `before` the first plugin above it that is
present; turning it off removes it. Plugin objects are single-use, so each add builds a new one.

**Stores:** `createMonitorsStore`, `createHmsSmokeStore`, `createHmsFireStore` and
`createCollocationSitesStore({ monitors })`. The monitors store is the one `/core` exposes (see
below), so the map and mobile's screens share it. Today's polling rules hold: the layout resumes
polling on mount (an immediate refresh) and pauses it on destroy; smoke, fire and collocation
load once.

### Options toolbar and panel

Kept as monitor-map's own components (`src/lib/options/`), same look, rows, defaults, wide and
narrow layouts, open/close and keyboard rules as today (`CLAUDE.md`, the 2026-10-05 options
toolbar spec). Only what they drive changes:

- **Pollutant:** PM2.5, Ozone, None. A change calls the monitors store's `entryTypeFor`. None
  removes the monitors plugin (and collocation sites) and keeps the store's pollutant. The
  `?pollutant=pm25|o3|none` sync stays in the layout, with today's history behavior.
- **Monitors:** type filters (Reference-grade and Low-cost groups, rows hidden for types that
  don't report the pollutant), Inactive and Inside (off by default): a `DataSource` wrapping the
  store's, filtering `features`; cluster averages follow the filter. Collocation Sites: shown
  only for PM2.5, and drawn only while monitors are on and the pollutant is PM2.5.
- **Layers:** Fire & Smoke (one checkbox, both plugins, on by default), EV Chargers (off) with
  Level 2 and Level 3 (on).
- **Overlays:** Wind (off).
- **Settings:** Marker Clusters (monitors' `clustered` and EV clustering), Basemap, Theme (the
  basemap variant), Reset Map Options (today's defaults, `src/lib/options/map-option-defaults.ts`).
- Row icons use map-sdk's exported marker shapes (`circle`, `square`, `triangle`,
  `withCrosshair`), so they match the map.

### Legend

Today's folding "Legend" card (bottom-left, `w-84`, info icon and chevron, expanded by default,
hidden when empty) around map-sdk's `<Legend order="top-first" />`. Sections and their look come
from map-sdk as the user approved them in milestone 2 (monitors titled by pollutant, fire as a
blocks bar, smoke in the plume colors, no collocation section).

### Search

Kept: the expanding search box, 500 ms debounce, monitors first (exact, prefix, substring, up to
4, with data-source logos), then MapTiler geocoding (US, fuzzy, up to 4, proximity from the
browser's location with the 3 s Valley fallback). A monitor result flies to zoom 12 and opens its
panel; an address flies to zoom 16, other places keep the zoom; a place drops a MapTiler `Marker`
through map-sdk's `maptilerMap()`. The pin is re-added when map-sdk replaces the GL map. Monitor
search reads the monitors store (monitors with a reading for the current pollutant, as today).

### Load screen

Kept: the animated logo cover, hidden once the map is `ready` (map-sdk's signal) and the monitors
store is initialized; a failed monitors load shows "Couldn't load air monitors." with Try again,
which calls the store's retry. The lazy wrappers (`LazyMapLayout`, `LazyMonitorDetailPanel`) and
`lazy-chunks.ts` keep their rules (`CLAUDE.md`, "Package entries").

### Layout shell

The routed panel, its slide-in (right on desktop, 2/3 + 1/3; bottom on phones, 50/50), and the
router escape hatch stay. They become internal (no `MapShell` export). The `map.resize()` after
the transition goes: MapLibre tracks its container's size.

### Detail panel

Unchanged in what it shows and how it loads (the 2026-10-12 detail panel spec), except:

- level colors and labels come from the entry type's `scale` (map-sdk's `levelFor` from
  `@sjvair/map-sdk/data` or the SDK's own, the builder's choice);
- the fixes below;
- the subscription manager lists the PM2.5 levels from the scale, by the level keys it uses
  today (`unhealthy_sensitive`, `unhealthy`, `very_unhealthy`, `hazardous`), skipping any key the
  scale lacks.

### Wind

A monitor-map plugin that adds `@maptiler/weather`'s `WindLayer` (`opacity: 0.5`) through
`PluginContext.addCustomLayer`, creating a fresh layer on every restyle. It draws lowest, as today.
map-sdk never imports `@maptiler/weather` (license policy); monitor-map does, and it stays off
`/core`.

### EV chargers

- A monitor-map plugin (on map-sdk's `pointsPlugin` where it fits, its own layers through
  `PluginContext` where it doesn't) with today's look: the two level icons, per-level clusters
  (radius 40, max zoom 9, the sized circles with counts), the cluster hover tooltip, cluster click
  eases to the expansion zoom, and the station popup on click (a MapTiler `Popup` through
  `featureclick` and `maptilerMap()`, one open at a time, today's contents).
- **Stations are in the feature list** (the user, 2026-11-05, an accessibility addition): the
  plugin exposes its stations as features, and picking one from the list opens its popup through
  `featureclick`, as a click does. The list shows only what's in view.
- Each level is fetched when first shown, as today; station 226154 is still dropped.
- **The NREL key is injected config** (see "Keys"), never read from `import.meta.env` inside
  `src/lib`. Keep `developer.nlr.gov` (the correct domain).
- **ZIP list cleanup:** check every county list against the Census ZCTA-to-county relationship
  file; fix misfiled ZIPs (found so far: 93541, Lee Vining in Mono County, is also in Tuolumne's
  list; the brief's "Inyo/Mono under San Joaquin" didn't check out: San Joaquin's list is all
  952xx plus 95686, Thornton); remove repeats from the query (37 ZIPs appear under more than one
  county, mostly ZIPs that span counties, and the query sends them twice). Keep the 5 mountain
  counties. Removing repeats changes nothing on the map; any fix that changes which chargers show
  is listed on the comparison page.

### HMS smoke and fire, collocation sites

map-sdk's presets and stores as in the demo: `hmsSmokePlugin` (outline in the plume color),
`hmsFirePlugin` (groups below zoom 10, hotspots from 10, blocks legend), `collocationSitesPlugin`
(crosshair `#4A5FC6`, wins the hover). Smoke and fire tooltips are map-sdk's accessibility
addition.

## Fixes folded in

1. **Chart stuck loading:** a background refresh that replaces a loading range change takes over
   the loading flag, so a failure clears the spinner.
2. **Subscription status errors:** a failed status load (not a cancel) shows "Couldn't load your
   alert settings." with Try again, styled like the panel's other messages; no unhandled
   rejection.
3. **Chart rebuilt on every refresh:** the rebuild effect tracks only what changes the chart
   (monitor type through a `$derived`, colors and label listed explicitly).
4. **Data box parsing:** `Math.trunc(Number(value))` (still whole numbers, cut off as the map's
   tooltips do; `.5` no longer shows `NaN`).
5. **No matching level:** the data box falls back to a neutral color instead of throwing.
6. **Chart labels:** the title and axis label come from the metadata (`entryType(...).label`), so
   "PM 2.5" becomes "PM2.5", matching the rest of the panel.
7. **No current readings:** the "Get the widget!" link is hidden; the subscribe button and
   temperature stay.
8. **Pacific days** in the chart's range and its "live" check (Decisions).
9. **Tests** for the chart's request guard, background refresh and `live` flag, and the panel's
   load, refresh and temperature effects, as component tests in a real browser (copy map-sdk's
   `browser` Vitest project).

## What changes for consumers

### Mobile (`../mobile`)

- **`/routes`** is unchanged: `monitorMapRoutes` with the map at `/` and a monitor at
  `/monitor/:id`, lazy as today.
- **`/core`** keeps `provideMonitorMapRouter` (and `MonitorMapRouterApi`, `useMonitorMapRouter`,
  `ROUTER_KEY`) and `monitorsManager`. `monitorsManager` becomes a thin wrapper over the map-sdk
  monitors store the map uses, keeping at least what mobile calls: `init(pollutant?, {
  autoUpdate?, signal? })` with today's sharing rules, `initialized`, `meta`, and `list` (an array,
  `null` before init). The builder may expose the underlying store as well.
- **`meta` is SDK 5.0's:** `levels` is gone; mobile's `Alerts.svelte`, `Subscriptions.svelte`,
  `MonitorSubscription.svelte` and `alert-level.ts` read `scale` (mobile migration's job, already
  in `DEFERRED.md`'s deploy entry).
- **Keys:** mobile passes the MapTiler and NREL keys to monitor-map explicitly (today they are
  read from mobile's build environment without it knowing).
- **Packages:** `@sjvair/sdk` becomes a peer dependency (`^5.0.0-beta.3` range for the betas), so
  mobile and monitor-map share one copy and mobile's `setOrigin` covers both (this closes the
  nested-copy risk in `DEFERRED.md`'s "Mobile: move `@sjvair/sdk`…" entry). `@sjvair/map-sdk` and
  `@maptiler/sdk` are ordinary dependencies; mobile adds neither.
- **Tailwind:** mobile adds `@source "../node_modules/@sjvair/map-sdk/dist";` and
  `@import "@sjvair/map-sdk/theme.css";` beside its existing monitor-map `@source`.
- **Exports that go away** from `.`: everything except `monitorMapRoutes`, the router context and
  `monitorsManager` (and their types). Mobile uses none of them.

### sjvair.com

No change. `npm run build` still writes `dist/monitor-map/sjvairMonitorMap.js` and
`sjvairMonitorMap.css` (code-split chunks beside them), mounts on `#SJVAirMonitorMap`, scopes its
CSS to it (`@scope`, the 2026-06-02 spec), resolves assets through `window.__cdnUrl`, reads
`globalThis.USER`, and takes `VITE_MAPTILER_KEY` and `VITE_NREL_KEY` from the build environment
(Heroku config vars), which the widget's `App.svelte` passes in as config. The deploy builds
`main`, so it needs map-sdk on npm by the day `release/5.0.0` merges.

### Keys

The library reads no keys. A host passes `{ maptilerKey, nrelKey }` once at startup (shape and
place left to the builder; next to `provideMonitorMapRouter` is the obvious spot). The widget's
`App.svelte` passes them from `import.meta.env`. `VITE_OPENWEATHERMAP_KEY` is unused (temperature
comes from `api.weather.gov`) and is dropped from the release workflow and `CLAUDE.md`.

### Theming

map-sdk's components (List button and panel, tooltips, legend) use theme tokens.

- **The widget** defines them in its own `src/app.css` to match today's white UI, light mode only,
  and imports map-sdk's `theme.css`. The CSS scope plugin keeps them inside `#SJVAirMonitorMap`.
- **Library hosts** use their own tokens, as monitor-map's components already do in the app
  today: `dist/lib` ships no token CSS. Mobile already defines every token map-sdk requires
  (`--background` … `--radius`, plus `--popover` and `--accent`) in its `src/app.css`.

## Packaging and release

- **Version** `5.0.0`, betas `5.0.0-beta.N`. Add an MIT `LICENSE` (holder as map-sdk's: "Central
  California Asthma Collaborative (SJVAir)") and `"license": "MIT"`.
- **Entries:** `.`, `./core`, `./routes`, built by `svelte-package` into `dist/lib`. `test:bundle`
  keeps checking that `/core` and `/routes` reach no map engine, weather layer or uPlot eagerly.
- **Release workflow:** publish a version with `-` to the `next` dist-tag (`--tag next`), as
  map-sdk's does; recent npm refuses a prerelease without a tag.
- **PR CI:** monitor-map has none today. Add a check/lint/test/test:bundle workflow for PRs into
  `release/5.0.0` once map-sdk is on npm (it can't install before then).
- **Branches:** each piece of work is a branch from `release/5.0.0` and a PR into it.
  `release/5.0.0` merges into `main` on go-live day, before sjvair.com `develop` deploys; the
  deploy entry already orders the mobile release after the deploy.

## Dependencies on other repos

- **map-sdk:**
  - **Two general `MapView` options for the List button and panel**, asked of map-sdk through
    the coordinator (2026-11-05): its corner (monitor-map uses top right, stacked below the
    engine's controls when `controls="engine"`), and showing the button only on keyboard focus
    (default stays always visible). Today it is fixed top-left in scoped CSS
    (`.mapsdk-list-panel`), under the toolbar and search. The shape is map-sdk's to choose; it
    must stay general, since the dashboard's Map widget uses `MapView` too.
  - **A published `0.x`**, before the first monitor-map beta or PR CI.
  - Anything the plan finds missing (e.g. `projection`/`space` across a basemap switch) goes to
    map-sdk through the coordinator, never worked around here.
- **`@sjvair/sdk`:** nothing new; 5.0.0-beta.3 has the Pacific helpers and the HMS signatures.
- **sjvair.com:** nothing.
- **mobile:** its migration plan takes the changes listed above.

## Testing and the parity check

- Unit and client Vitest projects as today, updated for what's left (options, pollutant param,
  monitor groups, panel pollutant, monitor details, the `/core` wrapper, ZIP list checks);
  component tests for the panel and chart in a browser project.
- `npm run check`, `lint`, `test`, `test:bundle` before each PR.
- **Comparison page:** an HTML page of paired screenshots, 5.0 (local stack) beside the public
  sjvair.com map, at desktop and phone widths: the map at load, each options menu (toolbar and
  panel), the legend, search (monitor and place, with the pin), the load screen and its error,
  monitor, cluster and collocation tooltips, EV clusters and popup, fire at zoom 9 and 10, smoke,
  wind, each basemap theme, the detail panel (with and without current readings, the chart, the
  widget modal, the subscription states). Each pair is labeled same / fix / accessibility /
  question. It goes at the top of the main monitor-map checkout, uncommitted; the user reviews it
  before `release/5.0.0` is called ready. Data differs between the two (local vs production), so
  pairs compare looks, not values.

## Deferral register (data-dashboard `DEFERRED.md`)

With the spec's approval: close "Shared date-range helper home" (decided above) and
"monitor-map: cancelling one-off loads" (resolved by map-sdk's stores); mark "chart stuck
loading" and "subscription status load errors" as fixed in 5.0 (closed when the PR merges into
`release/5.0.0`); note on the deploy entry that monitor-map 5.0 makes `@sjvair/sdk` a peer
dependency, needs map-sdk on npm, and changes mobile's key passing and Tailwind lines.

## Left to the builder

File layout; the `/core` wrapper's exact shape beyond what mobile uses; the keys config's name
and place; how the filter `DataSource` and the EV plugin are built; the order of work, as long as
nothing merges into `release/5.0.0` without the user's yes and the comparison page comes before
"ready".

## My calls (not the user's; flag any you disagree with)

- `@sjvair/sdk` as a peer dependency; map-sdk and `@maptiler/sdk` as ordinary dependencies.
- Data box readings cut with `Math.trunc(Number(value))`, keeping today's whole numbers.
- The subscription error text and its Try again button.
- The widget's theme tokens light-only, matching today's white UI; library hosts keep their own.
- No beta ships before the map-sdk changes it needs have landed.
- `VITE_OPENWEATHERMAP_KEY` dropped as unused.
- PR CI added once map-sdk is on npm.
- The Census ZCTA-to-county file as the check for the EV ZIP list.
