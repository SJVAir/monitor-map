# monitor-map 5.0 on map-sdk's shared options toolbar

Date: 2026-11-13
Target release: 5.0.0 (betas on npm `next`; each release is the user's yes)
Base branch: `release/5.0.0` (ab4c488). Work on `feat/shared-options-toolbar`, PR into
`release/5.0.0`. `main` is not touched until go-live day; `.worktrees/5.0-design` is never touched.

## Why

The user decided (2026-11-11, in the dashboard's Map widget brainstorm) that map-sdk gets one
shared, host-controlled options toolbar, and that monitor-map 5.0 moves onto it, replacing its own.
map-sdk built that toolbar as monitor-map 5.0's own, shared: the same groups (Pollutant, Monitors,
Layers, Overlays, Settings), rows, words, icons and sizes. It shipped in `@sjvair/map-sdk`
`0.1.0-beta.13` (map-sdk #29, 2026-11-13). The dashboard's Map widget adopts the same toolbar, so
sjvair.com, the mobile app and the dashboard end up with one toolbar to maintain.

A visitor to sjvair.com or the app should see the toolbar they see today. The visible differences
below are the ones the user has decided.

## Decided

- **Labels, groups and help text come from the server's metadata**, through map-sdk's
  `MetadataProvider`, not from monitor-map's code. bam1022 reads **"BAM 1022"** in the Monitors
  menu at go-live, where 4.3 says "SJVAir" (the user, 2026-11-13). The rename follows the server
  label whenever the user lifts the hold of 2026-11-12 (already in data-dashboard `DEFERRED.md`).
- **The values are one flat `OptionValues` record** (approach A below, the user, 2026-11-13).
- **The legend at 390 px is fixed here** (the user, 2026-11-13): the expanded legend no longer
  runs under the zoom, compass and locate buttons.
- **`@sjvair/sdk` `5.0.0-beta.10`, peer range `^5.0.0-beta.10`** (the user, 2026-11-13). See
  "Constraints".
- **The toolbar's wide/narrow switch follows the map's mount point, not the map** (the user,
  2026-11-13). Today monitor-map switches on the window (Tailwind `md`); map-sdk's toolbar switches
  on the map's own box (48rem), so a monitor panel opening (the map shrinks to 2/3) would turn the
  row into the options button on windows from 768 px (48rem) to about 1150 px. The user chose a map-sdk
  change over accepting that: the host marks the box that holds the whole map (for monitor-map,
  `MapShell`'s outer box: map plus detail panel), and the switch measures that box. The box doesn't
  shrink when the panel opens, so the toolbar keeps today's behaviour (a wide row, wrapping as it
  does today). See "Layout root (needs a map-sdk beta)".
- **From map-sdk's toolbar brainstorm (the user, 2026-11-12), taken as given here:** switching
  basemap goes to the new basemap's default variant (4.3 kept the variant type); the List button
  stacks below the toolbar at top-left; the toolbar's look, icons and words are monitor-map's.

## Goals

1. monitor-map renders `OptionsToolbar` from `@sjvair/map-sdk` (`0.1.0-beta.13`, then the beta
   with the layout root); its own toolbar UI
   is gone.
2. Every row and behaviour of today's toolbar still works: Pollutant (PM2.5, Ozone, None, with
   `?pollutant=` both ways), Monitors (two select-all headings over the types, Inactive, Inside,
   Collocation Sites for PM2.5 only, the group disabled under None), Layers (Fire & Smoke, EV
   Chargers with Level 2 and Level 3), Overlays (Wind), Settings (Marker Clusters for monitors and
   EV, Basemap, Theme, Reset Map Options), Search.
3. Phone widths and touch work, as mobile uses the map through `/routes`.
4. `/core` and `/routes` keep their exports and behaviour.
5. The two deferred legend items are done (see "Legend").

## Non-goals

- Changing map-sdk, mobile, sdk-js, sjvair.com or data-dashboard code. A map-sdk gap is reported
  to the coordinator, never worked around here (no CSS overrides of map-sdk internals).
- New options, rows or groups.
- Persisting options across page loads (today they live for the page, surviving layout remounts).
- The comparison rerun and the user's parity review: they come after this move.

## Anti-goals (failure even if it works)

- Any label, help text, unit, group heading, scale or color written into monitor-map's code where
  the metadata or map-sdk has it. (monitor-map's own rows, EV Chargers, Level 2, Level 3 and Wind,
  keep their words in monitor-map, as today: no metadata carries them.)
- Two copies of the option values or their defaults.
- A change to what `/core` exports, or `/core` reaching the map engine.
- The toolbar unusable by keyboard, screen reader or touch, or a regression against WCAG 2.2 AA.

## Constraints

- `@sjvair/map-sdk` `0.1.0-beta.13`, pinned exactly; `npm ls @maptiler/sdk svelte @sjvair/sdk`
  shows one copy of each.
- `@sjvair/sdk` dev pin `npm:@jsr/sjvair__sdk@5.0.0-beta.10` (jsr's `latest` is 4.7.0, so the pin
  is exact). Its `getMonitorsMeta()` throws against a server without `monitor_groups`
  (sjvair.com #332, on `develop`). That's acceptable: 5.0 goes live with the `develop` deploy, and
  the local stack has them. The peer range rises from `^5.0.0-beta.3` to **`^5.0.0-beta.10`**: an
  older SDK loses the Monitors headings and the pollutant help text, which this spec counts as a
  parity loss.
- `Scale` gained required `averaging_hours`, `daily_statistic`, `daily_statistic_label` in the SDK;
  any test fixture or code that builds a `Scale` sets them (`null` is fine).
- Theme tokens only for the toolbar's surfaces (map-sdk's). The icon tints monitor-map passes are
  today's Lucide tints.
- Nothing touches production; the local stack sends real SMS, and this work writes no
  subscriptions or alerts.

## Approaches

- **A. The toolbar's flat record is monitor-map's state (chosen).** `mapOptions` becomes one
  `OptionValues` record; defaults come from the presets plus monitor-map's EV and Wind rows;
  plugins, the monitor filter and Reset read it. More of monitor-map's code and tests change, but
  there is one copy of the values and one set of defaults, it matches the dashboard's setup, and a
  new monitor type needs no code.
- **B. Keep today's nested `MapOptions` with an adapter** to and from the record. Fewer files
  change, but two shapes and two sets of defaults stay in step by hand, and the fixed list of seven
  types stays in code, against "metadata is the source of truth". Not chosen.
- A monitor-map wrapper component around `OptionsToolbar` was dropped: `MapShell` can pass the
  toolbar straight to `MapView`'s `toolbar` snippet.

## Design

### Where it renders

`MapShell` stops rendering `OptionsBar` and passes a `toolbar` snippet to `MapView`. Its `menu`
prop goes; `MonitorMapLayout` gives it the toolbar instead (the toolbar needs the layout's map,
values and stores). `Search` goes in `OptionsToolbar`'s `search` slot: last on the wide toolbar,
beside the options button on the narrow one, as today.

`MapView` keeps `controls="engine"`, `tooltip="pointer"`, `selectionBar={false}` and
`featureList={{ reveal: "focus" }}`; the List button moves from `position: "top-right"` to the
default top-left, where map-sdk stacks it under the toolbar.

**The legend moves into `MapView`'s `overlays` snippet.** Today it's a sibling of `MapView` in
`MapShell`, so it can't read `--mapsdk-toolbar-height` (set on the map's box), and it wouldn't go
inert with the rest of the map while the narrow options panel is open.

### Layout root (needs a map-sdk beta)

A map-sdk gap, reported to the coordinator for a map-sdk session (2026-11-13). What monitor-map
needs: a way for the host to mark an ancestor element (proposed: a `mapLayoutRoot` attachment,
found by `MapView` through context) whose width decides the toolbar's wide/narrow layout, with
today's measure (a frame later, against 48rem) applied to that box. Without the mark, `MapView`
measures its own box, as in `0.1.0-beta.13`, so the dashboard is unaffected. Only the wide/narrow
decision moves: dropdowns and the panel still stay inside the map's box, and
`--mapsdk-toolbar-height` is unchanged. The final API is map-sdk's to name.

Sequencing: everything else builds on `@sjvair/map-sdk` `0.1.0-beta.13`. The last step re-pins to
the map-sdk beta that has the layout root and puts it on `MapShell`'s outer box; it lands before
this PR merges. If map-sdk isn't ready by then, it's recorded in data-dashboard `DEFERRED.md` as a
miss to finish before monitor-map's next npm beta, not merged as an open question.

### The values

`src/lib/options/option-values.svelte.ts` (replacing `map-options.svelte.ts`) holds one module-level `$state` record (`OptionValues`), so
the options survive the layout remounting as today. Its keys:

| Key | Row | Default |
| --- | --- | --- |
| `pollutant` | Pollutant radios (`pm25`, `o3`, `none`) | see below |
| `type:<type>` | each monitor type (preset key) | on |
| `inactive`, `inside` | Inactive, Inside | off |
| `collocationSites` | Collocation Sites | off |
| `clustered` | Marker Clusters (monitors and EV) | on |
| `basemap` | Basemap select and Theme radios | `map.basemap.defaultId` |
| `fireAndSmoke` | Fire & Smoke (`hmsOptions`) | on |
| `evStations`, `ev:lvl2`, `ev:lvl3` | EV Chargers, Level 2, Level 3 | off, on, on |
| `wind` | Wind | off |

**The basemap doesn't survive a layout remount** (my call, as today: each mount builds a new map
that opens on Streets v4's default variant). On mount the record's `basemap` is set to
`map.basemap.defaultId`, so the record and the map agree. Every other key survives, as today.

Defaults are today's (`map-option-defaults.ts`), now assembled from the presets' `defaults` plus
monitor-map's own rows. A `type:<type>` key that's missing counts as on, so a monitor type the
server adds draws and gets a row with no code change. (Today a type with no key never draws.)

**The pollutant stays in `monitorsManager`.** `/core` and mobile read `monitorsManager.pollutant`,
and "None" is not a value of it. The toolbar's `pollutant` value is derived:
`currentSelection(monitorsManager.pollutant, monitorsOn)`. `onchange` applies a changed
`pollutant` through `applyPollutantSelection`, and `monitorsOn` stays a separate module-level flag
beside the record. The `?pollutant=` sync in `MonitorMapLayout` is unchanged in behaviour.

`onchange(next, changed)` writes the record, applies the pollutant, and calls
`map.basemap.select(next.basemap)` when `basemap` changed. Plugins follow the record through
`wantedPlugins` and `syncPlugins` as today (string keys instead of nested fields); `clustered`
still rebuilds monitors and EV only.

Reset is the `reset` row `settingsGroup` gives: the toolbar puts `defaults` back as one change.
`defaultPollutant` passed to `monitorsOptions` is the metadata's `default_pollutant` (when it's one
monitor-map shows), so Reset goes back to the server's default pollutant with monitors on, and to
Streets v4's default variant, as today.

### The groups

Built in a `$derived` in `MonitorMapLayout` (or a small module it calls), in this order:

- `monitorsOptions(map)` (created once per map) `.groups({ types, pollutants, pollutant,
  defaultPollutant, hasInactive: true, hasInside: true, collocation: true, none: true, icons })`
  gives Pollutant and Monitors.
  - `types`: every type in the metadata's `monitors`, sorted by label (my call: that is today's
    order, AirNow, AQLite, AQview, BAM 1022 / AirGradient, PurpleAir, VOZbox, without a list in
    code; the metadata orders only the groups). Every type gets a row and a `type:` default
    whether or not it has loaded monitors, as all seven do today. The preset leaves out types that
    don't report the pollutant and builds the headings from `monitor_groups`.
  - `pollutants`: the metadata's `available_pollutants` that monitor-map can show (`pm25`, `o3`).
  - `hasInactive` / `hasInside`: always `true` (my call: today both rows always show).
  - `icons`: Monitors `RadioTower` `#4682b4`; PM2.5 and Ozone monitor-map's artwork
    (`pm25-02-particle-field.svg`, `ozone-08-sunrise-haze.svg`, as `{ svg }` or an `<img>`
    snippet); None `Ban` `#778899`; Collocation `Crosshair` `#4A5FC6`.
  - **Button rows as today:** `[Pollutant | Monitors]` and `[Layers | Overlays | Settings]`. The
    preset returns plain data, so monitor-map sets `cluster: "monitors"` on the Pollutant and
    Monitors groups it returns and `cluster: "options"` (the presets' default) on the rest.
- **Layers** (monitor-map's group, `Layers` `#708090`): `hmsOptions(map)`'s Fire & Smoke row
  (`Flame` `#ff4500`), then EV Chargers, a checkbox (`EvCharger` `#708090`) whose children are
  Level 2 and Level 3 with today's EV marker SVGs (`row-icons.ts`).
- **Overlays** (monitor-map's group, `SquareStack` `#708090`, `align: "end"`): Wind (`Wind`
  `#1e90ff`).
- `settingsGroup(map, { icon, clusters: { icon }, basemap: { icons }, reset: { icon } })`: Settings
  `#696969`, Marker Clusters `Network` `#1e90ff`, Basemap `Map` `#708090`, Theme `Contrast`
  `#708090`, Reset `RotateCcw`. Pass `basemapKey="basemap"` so the rows show what the map draws,
  including a basemap that failed and reverted.

Group words come from map-sdk's message keys (`mapsdk_options_layers`, `mapsdk_options_overlays`,
…); EV Chargers, Level 2, Level 3 and Wind are monitor-map's strings, as today.

### Basemaps

`createLiveMap` uses `defaultBasemaps({ keepPoiLabels: true })` (today's
`{ ...defaultBasemaps(), excludedLayers: [] }` no longer keeps POI labels). `basemaps.ts`'s style
list, `basemapChoices`, `choiceForId`, `switchBasemap` and `monitorMapBasemaps` go;
`defaultBasemapId` goes if nothing else needs it (`map.basemap.defaultId` replaces it). map-sdk's
list omits MapTiler's deprecated Basic, Toner and Voyager, which monitor-map lists today.

### Legend

- **Offset:** the legend wrapper's `top-18` / `md:top-32` become a top offset from
  `--mapsdk-toolbar-height` plus the 16px inset (closes `DEFERRED.md` "final-review minors from
  #131 and #132", item 3).
- **Width:** on a narrow map the expanded legend stops short of the engine's right-hand controls
  (zoom, compass, locate), so at 390 px it never runs under them (closes "an expanded legend can run
  under the zoom and compass buttons at 390 px"). The cap is computed from the map's width
  (`--mapsdk-map-width`), not the window's.
- Its panel-open auto-collapse keeps reading the page layout (the panel takes the bottom half below
  Tailwind `md`), so `isWideLayout` moves out of `options/layout.ts` (which goes) to a place the
  legend and `MapShell` share.

### What goes

`OptionsBar.svelte`, `OptionsMenu.svelte`, `OptionsGroup.svelte`, `options-state.svelte.ts`,
`group-state.ts`, `layout.ts` (after `isWideLayout` moves), `map-option-defaults.ts` (its defaults
fold into the presets' and the layout's), `menus/`, `rows/`, the parts of `basemaps.ts` above, and
`REFERENCE_GRADE_TYPES` / `LOW_COST_TYPES` / `TYPE_LABELS` (`monitor-groups.ts` keeps only what
still has a caller). `row-icons.ts` keeps the EV level icons. Their tests go or move with them.

### Packages and exports

- `@sjvair/map-sdk` `0.1.0-beta.6` → `0.1.0-beta.13`, exact, then → the beta with the layout
  root (above), exact. Read map-sdk's README "Changes" for
  `0.1.0-beta.7` to `0.1.0-beta.13` and apply every breaking change that touches monitor-map (the
  `Scale` fields, `defaultBasemaps`, `map.basemap.select`'s fallback, the extra `role="status"`
  element in tests).
- `@sjvair/sdk` dev `5.0.0-beta.3` → `5.0.0-beta.10`, exact; peer `^5.0.0-beta.10`.
- `package.json` version `5.0.0-beta.2` (the release itself is the user's yes).
- `.`, `./core`, `./routes`: same exports. `npm run test:bundle` passes unchanged.

## Testing

- Unit (`server`/`client` projects): the values module (defaults, a missing type key counts as on,
  Reset restores them), `wantedPlugins` on the record, `filteredMonitors` on the record, the
  pollutant bridge (`none` and back, `?pollutant=` both ways), `syncPlugins` order unchanged.
- Browser (`tests/browser`): `MonitorMapLayout` or `MapShell` with a fake metadata provider renders
  the five groups with their rows; Pollutant → None disables Monitors and removes the monitors
  plugin; a select-all heading flips its types in one change; EV children appear only while EV
  Chargers is on; Reset puts the defaults back; at 390 px the options button opens "Map Options";
  the legend sits below the toolbar and clear of the right-hand controls at 390 px; with the layout
  root, a 1024 px shell with a panel open keeps the wide row.
- `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm run test:bundle`.
- Scripted look at 1440, 1024 and 390 px against the local stack (headless Chrome, as in the
  comparison script): touch on the narrow panel, Esc returns focus, reduced motion has no slide.

## For hosts

- Breaking: the `@sjvair/sdk` peer range rises to `^5.0.0-beta.10`.
- monitor-map needs a server whose monitors metadata has `monitor_groups`.
- `.`, `./core` and `./routes` keep their exports; hosts change no code.

## Docs and deferrals

- monitor-map `CLAUDE.md` and README: the options section (toolbar from map-sdk, the values record,
  the pollutant bridge), the map-sdk pin, the sdk pin and peer range.
- data-dashboard `step-5` (own worktree): `TODO.md` row "Step 5, part 2: monitor-map 5.0" (held
  while the dashboard's spec 3 PR into `step-5` is open), `ARCHITECTURE.md` → "Map SDK", and
  `DEFERRED.md`: close the 390 px legend entry and item 3 of the #131/#132 entry.

## Left to the builder

- Where the group-building code lives (in `MonitorMapLayout` or a module beside it).
- The exact legend width cap and how it reads the controls' width.
- Test file layout.
