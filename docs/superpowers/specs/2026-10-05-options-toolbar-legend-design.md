# Options Toolbar & Unified Legend — Design

**Date:** 2026-10-05
**Branch:** `feat/new-options-menu`
**Reference demo:** https://map-toolbar.derek-payton.workers.dev/ (static Bulma + Font Awesome Pro + vanilla JS mockup)

## Goal

Replace monitor-map's current display-options popover (`Menu` + `*DisplayOptions`) and its
separate floating legend cards with the demo's design — a toolbar of dropdown menus on wide
viewports that becomes a full-screen options panel on narrow viewports, plus a single collapsible
legend — re-implemented with this repo's tooling (Svelte 5 runes, Tailwind v4, lucide, existing
map integrations).

## Decisions (agreed during brainstorming)

| Topic | Decision |
|---|---|
| Scope | Only features monitor-map already has, **plus** a new Pollutant "None" option. No placeholders for the demo's unimplemented layers (Pesticide Sprays, Weather Stations, Heat/AQ Forecast, TEMPO, TROPOMI, Boundaries, NASA OWWL). Menus/legend are structured so these can be added later as their own projects. |
| Demo-only chrome | Not ported: top bar, layout toggle, dark-mode toggle, screenshot background. No dark mode. |
| Layout switch | Viewport width only: toolbar at ≥ Tailwind `md` (48rem / 768px), options panel below. Layout is pure CSS (`md:` / `max-md:` variants); no reactive layout rune. |
| Monitor grouping | Reference-grade / Low-cost groups, split by vendor (drops the "SJVAir non-FEM" concept). |
| Merged controls | One "Fire & Smoke" checkbox drives both HMS integrations; one "Marker Clusters" setting drives monitor + EV clustering. Integrations keep separate flags underneath. |
| Overlays | Independent checkboxes — multiple overlays may be on at once. No mutual exclusivity, now or later. |
| Icons | lucide for UI chrome; our own generated map-marker images for item rows (monitor shapes, EV icons). No Font Awesome. |
| Map controls | MapTiler's default top-right controls are unchanged. |
| Library API | Breaking: old menu/legend components and exports are removed; new building blocks exported. Ships as **4.0.0**. |
| Pollutant legend data | Built from `/monitors/meta/` levels so it always matches marker colors (see "Known data note"). |
| Tests | Add Vitest for extracted pure logic. |

## Architecture

### File layout

```
src/lib/options/
  OptionsBar.svelte        container: toolbar row (md+) / menu button + full-screen panel (<md)
  OptionsMenu.svelte       one dropdown (md+) / one collapsible panel section (<md)
  rows/
    CheckboxRow.svelte     checkbox + icon + label
    RadioRow.svelte        radio + icon + label (+ optional unit and help text)
    GroupRow.svelte        select-all checkbox with indeterminate state + child list
    SubmenuRow.svelte      checkbox whose child list shows only while checked
  menus/
    PollutantMenu.svelte
    MonitorsMenu.svelte
    LayersMenu.svelte
    OverlaysMenu.svelte
    SettingsMenu.svelte
  group-state.ts           pure: group checked/indeterminate + select-all application
  pollutant-param.ts       pure: ?pollutant= <-> { pollutant, monitorsEnabled }
  basemap.ts               pure: choose variant when the basemap changes
  layout.ts                isWideLayout(): one-shot matchMedia check for click handlers
  reset.ts                 resetMapOptions()
src/lib/legend/
  Legend.svelte            collapsible card
  LegendBar.svelte         gradient / blocks bar + labels
  legend-data.ts           pure: levels -> gradient data, blocks -> CSS gradient, tick positions
  PollutantLegend.svelte
  FireSmokeLegend.svelte
tests/                     Vitest specs (outside src/lib so they never ship in the package)
vitest.config.ts
```

### Responsive strategy

- All visual switching uses Tailwind `md:` / `max-md:` variants: toolbar row vs. panel, dropdown
  popovers vs. in-flow sections, hover-to-open (`md:group-hover:` + `focus-within`), Settings
  label visibility, search placement (flex ordering within the same row — Search is rendered once).
  A `<style>` block is used only where `class:` / variants can't express a rule (per CLAUDE.md).
- The two behaviors that differ by layout are decided at event time by `isWideLayout()`
  (`matchMedia("(min-width: 48rem)").matches`), not reactive state:
  1. Opening a dropdown via click closes the others (wide); sections are independent (narrow).
  2. Picking a pollutant closes its dropdown (wide); the section stays open (narrow).
- Crossing the breakpoint needs no handling: the panel's `open` state simply has no visual
  effect at wide widths.

### `OptionsBar` state

- `panelOpen` — narrow-layout panel open/closed.
- `openMenu` — id of the dropdown opened by click (wide) / set of expanded sections (narrow).

Both are local to `OptionsBar` and passed to `OptionsMenu`s via props/context. Nothing outside
`OptionsBar` needs either one (the narrow panel is full-width, so the legend never shifts).

### `MapShell` integration

- `MapShell`'s `menu` snippet now renders inside `OptionsBar` (positioned top-left over the map,
  `z-10`) instead of the old `Menu`.
- `Search` moves out of `MonitorMapLayout`'s `overlays` snippet and into `OptionsBar` (end of the
  toolbar row on wide layouts; beside the menu button on narrow).
- The legend is rendered from `MonitorMapLayout`'s `overlays` snippet at bottom-left, as today.
- `MapShell`'s public props are unchanged; only what renders the `menu` snippet changes.

## Menus

### Pollutant

- Rows: **PM2.5** (µg/m³) — "Fine particles from smoke, dust, and vehicle exhaust."; **Ozone**
  (ppb) — "Ground-level gas that forms in sunlight on hot days."; **None**. Each has a lucide icon.
- The trigger shows the selected row's icon and name.
- **None** is *not* a new `monitorsManager.pollutant` value. It sets
  `monitorsMapIntegration.enabled = false`; the manager keeps its last real pollutant, so the
  `MonitorsDataSource` interface, SDK calls, detail panel and search are untouched and switching
  back is instant. Selecting PM2.5/Ozone sets the pollutant and re-enables the integration.
- URL sync (in `MonitorMapLayout`, extending the existing two-way effects): `?pollutant=none` ↔
  integration disabled; `pm25` / `o3` ↔ pollutant set + integration enabled. Mapping logic lives
  in `pollutant-param.ts`.
- The refetch-on-pollutant-change `$effect` currently in `MonitorsDisplayOptions` moves into
  `MonitorMapLayout` next to the URL sync.
- While None: Monitors trigger is disabled (content grayed, button background stays opaque, no
  hover-open), Collocation Sites is hidden, the pollutant legend section is hidden.
- Collocation Sites is only *available* while monitors are enabled and the pollutant is PM2.5.
  While unavailable its layer is removed (and `apply()` refuses to re-add it, e.g. on the
  `integrationsManager.refresh()` after a basemap change); the user's checkbox choice is kept, so
  the sites return when PM2.5 is picked again — extending the integration's existing Ozone
  behavior to None. Its `remove()` also disables its tooltips.
- `MonitorsMapIntegration` and `EvStationsMapIntegration` constructor effects that call `apply()`
  on data/cluster changes must early-return while `enabled` is `false`, otherwise the next 2-minute
  data refresh would re-add a disabled layer.

### Monitors

```
[▲] Reference-grade  (select-all)     [●] Low-cost sensors  (select-all)
      AirNow                                AirGradient
      AQLite                                PurpleAir
      AQview                                VOZbox
      SJVAir   (bam1022)
─────────
[■] Inactive
[■] Inside
[⌖] Collocation Sites   (PM2.5 only)
```

- Group icons use our generated marker images (`outside-display-triangle` /
  `outside-display-circle`); Inactive/Inside use their existing marker images; Collocation Sites
  uses the existing crosshair icon in its current color.
- Rows whose monitor type doesn't support the current pollutant are hidden, via the existing
  meta-driven `pollutantSupportedByType` (not the demo's hardcoded per-row lists). A group with no
  visible rows is hidden.
- Group select-all considers only visible rows: checked when all are checked, indeterminate when
  some are, unchecked when none. Toggling the master sets all visible rows. Logic in
  `group-state.ts`.
- A group's child list shows while the group is checked or indeterminate (demo behavior: submenus
  show only while their parent is on; the chevron is decorative).
- **`MonitorsMapIntegration` changes** (vendor split):
  - Remove the `sjvair` display option.
  - `purpleair` matches every PurpleAir (`type == "purpleair"`, any `is_sjvair`).
  - Add `airgradient` matching `type == "airgradient"`.
  - Update the cluster per-type visibility mapping accordingly.
  - Marker shapes are unchanged (still chosen by `is_sjvair` in the icon manager).
  - Labels: `bam1022` becomes "SJVAir"; others keep their names.
- Collocation Sites toggles `collocationSitesMapIntegration.enabled` (moved here from Map Layers).

### Layers

- **Fire & Smoke** — checked iff both `hmsFireMapIntegration.enabled` and
  `hmsSmokeMapIntegration.enabled`; setting it sets both.
- **EV Chargers** — toggles `evStationsMapIntegration.enabled`. Its submenu (Level 2, Level 3 with
  their EV marker images, bound to `displayOptions.lvl2/lvl3`) shows only while checked.
  Defaults change to match the demo while keeping today's initial map (no EV stations shown):
  integration `enabled` defaults to `false`, Level 2 / Level 3 default to `true`. Station data is
  lazy-fetched only when the integration is enabled **and** the level is on.

### Overlays

- **Wind** — toggles `windMapIntegration.enabled`. Independent checkbox; future overlays are
  added as further independent rows.

### Settings

Trigger is a gear icon only on wide layouts; the panel section is labeled "Settings".

- **Marker Clusters** — checked iff both monitor and EV `clustered`; setting it sets both.
- **Basemap** — `<select>` over `MAP_STYLE_OPTIONS`.
- **Theme** — radio list built from `selectedReferenceStyle.getVariants()` (live from the MapTiler
  SDK, not a hardcoded table), labeled with `variant.getName()`. When the basemap changes, keep
  the same variant type if the new style has it (`getType()` → `hasVariant()` / `getVariant()`),
  else `getDefaultVariant()`. Logic in `basemap.ts`. Applying a style keeps the existing
  `setStyle` + `style.load` → `integrationsManager.refresh()` flow from `MapStyleDisplayOptions`.
- **Reset Map Options** — calls `resetMapOptions()`, which restores:
  - pollutant → `meta.default_pollutant`, monitors integration enabled
  - monitor types: all vendor types on (AirNow, AQLite, AQview, SJVAir, AirGradient, PurpleAir,
    VOZbox); Inactive and Inside off
  - collocation sites off, Fire & Smoke on, EV off (Level 2 + Level 3 on), Wind off
  - monitor + EV clustering on
  - basemap → `DefaultMapStyle`

  It does not touch the legend's collapsed state or search. The defaults live in one table in
  `reset.ts` rather than being re-read from constructors.

### Interaction

**Wide (≥ md):**
- Dropdown opens on hover or keyboard focus (`focus-within`).
- Clicking a trigger toggles that dropdown and closes others; hovering a different trigger also
  closes a click-opened one.
- Clicking outside closes all; clicks inside a dropdown never close it.
- Overlays and Settings dropdowns align to their right edge.
- Dropdown content scrolls beyond `69vh`.

**Narrow (< md):**
- Menu button (lucide `Menu` / `X`) and Search at the top-left of the map area.
- Panel covers the full map area (not the detail panel), titled "Map Options" with a close button;
  Escape closes it.
- Sections open/close on click; several may be open.

**Search:** existing `Search` behavior is kept (monitor + geocode results, fly-to, marker),
restyled to toolbar-button height. It expands on click/focus, not hover.

## Legend

### `Legend.svelte`

- White rounded card with shadow, bottom-left of the map area, ~21rem wide (capped to viewport
  width minus margins on small phones).
- Header: lucide info icon, "Legend", chevron. Clicking anywhere on the header toggles collapse;
  the chevron rotates. Collapse state persists while sections change.
- Hidden entirely when no section has content.
- Sections stack with a fixed gap; each has a centered title with a muted unit, a bar, and labels.

### `LegendBar.svelte`

Data-driven; three modes:

1. **gradient** `{ colors, ticks }` — smooth gradient; tick labels absolutely positioned at their
   exact percentage (first/last edge-anchored, middle ones centered via `-translate-x-1/2`).
2. **blocks + labels** `{ categories: [{ color, label }] }` — hard-edged equal-width blocks, one
   centered label per block.
3. **blocks + breakpoints** `{ categories: [{ color }], breakpoints }` — hard-edged blocks, labels
   on block boundaries (for future discrete overlays).

CSS gradient strings and tick positions come from `legend-data.ts`.

### Sections in this project

- **Pollutant** — shown when the monitors integration is enabled. Title "PM2.5 (µg/m³)" or
  "Ozone (ppb)". Gradient colors from `monitorsManager.levels` (`level.color`, which already
  includes `#`). One tick per level, `Math.floor(level.range[0])`, positioned at that level's
  color stop (`i / (n - 1)`), e.g. PM2.5 0 · 9 · 35 · 55 · 150 · 250. Handles any number of
  levels.
- **Fire & Smoke** — shown while Fire & Smoke is on.
  - "Fire (MW)": blocks + labels from the FRP tiers (`<10`, `10-49`, `50-149`, `150-349`, `≥350`),
    colors from `FRP_TIERS` (exported from `hms-fire-icon-manager.ts`).
  - "Smoke Density": blocks + labels Light / Medium / Heavy. Colors come from the smoke layer's
    fill colors (extracted into an exported constant shared by the layer and the legend), mixed
    toward white at the layer's fill-opacity so swatches resemble what the map shows.
- **Wind** — no legend.

### Known data note

The live `/api/2.0/monitors/meta/` ozone levels are EPA **1-hour** breakpoints (USG 125, Unhealthy
165, Very Unhealthy 205, Hazardous 405–604.9; no Good/Moderate split below 125). The current
hardcoded legend used **8-hour** breakpoints (55/71/86/106/201), so it disagreed with marker
colors. Building from metadata makes the legend match the markers; whether the backend should use
8-hour breakpoints is a separate backend question, out of scope here. PM2.5 metadata is current
(Good 0–9.0); the old hardcoded `12` was stale.

## Removed

Components and their `index.ts` exports: `Menu`, `DisplayOption`, `MonitorsDisplayOptions`,
`EvStationsDisplayOptions`, `MapLayersDisplayOptions`, `MapStyleDisplayOptions`, `ToggleSwitch`,
`SegmentedControl`, `MapLegend`, `MonitorMarkersLegend`, `HMSFireLegend`.

## New exports

`OptionsBar`, `OptionsMenu`, the row components, the five menu components, `Legend`, `LegendBar`,
`PollutantLegend`, `FireSmokeLegend`, `resetMapOptions`. A host composing `MapShell` directly
builds its own menu from these.

## Testing

- Add Vitest (devDependency) with a dedicated `vitest.config.ts` (the main `vite.config.ts`
  requires `PROD_MODE` for non-development modes) providing the `$lib` alias and the Svelte
  plugin; `npm test` script. Specs live in top-level `tests/` so they never ship in `dist/lib` or
  `src/lib`.
- Unit-tested pure modules:
  - `group-state.ts` — checked/indeterminate/unchecked; select-all ignores hidden rows; empty group.
  - `pollutant-param.ts` — `pm25` / `o3` / `none` / missing / invalid in both directions.
  - `basemap.ts` — keeps the variant type when available, falls back to default otherwise
    (with fake style objects implementing the SDK's variant methods).
  - `legend-data.ts` — levels → colors/ticks (5- and 6-level inputs), block gradient strings,
    tick percentage positions.
  - `reset.ts` — applies the defaults table to fake targets.
- Plus: `npm run check`, `npm run lint`, `npm run build`, `npm run build:lib`, and a manual
  click-through of every menu and legend state in Chrome at desktop and phone widths.

## Out of scope

Demo layers not yet backed by data, map-control restyling, dark mode, the ozone breakpoint backend
question, the macOS `map.svelte.ts` case-collision fix, and publishing (releases require explicit
per-release approval).
