# EV Stations Map Integration Design

**Date:** 2026-05-26
**Branch:** feat/ev-stations

## Overview

Convert the existing Leaflet-based EV stations module into a MapTiler SDK integration that follows the same plugin architecture used by the monitors module. The integration supports clustered and unclustered display, click-based tooltips (one at a time), two charging level display options (Level 2 / Level 3), and colored icons using the `ev_station` SVG.

---

## File Structure

```
src/lib/ev-stations/
  types.ts                              ← add new interfaces (update)
  ev-station-icons.ts                   ← SVG generation + icon manager (new)
  ev-stations-cluster-renderer.ts       ← cluster layer management (new)
  ev-stations-map-integration.svelte.ts ← main integration (rewrite, currently empty)
  components/
    EvStationTooltip.svelte             ← click popup for individual stations (new)
    EvStationClusterTooltip.svelte      ← hover tooltip for clusters (new)
    EvStationsDisplayOptions.svelte     ← display options panel (new)
  mod.ts                                ← DELETE
```

---

## Types

Add to `types.ts`:

```ts
export interface EvStationMarkerProperties {
	icon: string; // "ev-station-lvl2" | "ev-station-lvl3"
	id: number;
	level: "lvl2" | "lvl3";
	station_name: string;
	facility_type: string;
	ev_network: string;
	station_phone: string;
	street_address: string;
	city: string;
	state: string;
	zip: string;
	access_days_time: string;
	access_detail_code: string;
	cards_accepted: string | null;
	ev_pricing: string;
	ev_connector_types: string; // JSON.stringify(string[])
}

export type EvStationMapFeature = Feature<Geometry, EvStationMarkerProperties>;

export interface EvStationClusterMapFeature extends MapGeoJSONFeature {
	properties: {
		cluster: true;
		cluster_id: number;
		point_count: number;
		point_count_abbreviated: string | number;
	};
	// level is derived from feature.source ("ev-stations-lvl2" | "ev-stations-lvl3")
}
```

---

## Icon Generation (`ev-station-icons.ts`)

Level color constants:

```ts
export const EV_STATION_LEVELS = {
	lvl2: { bg: "rgb(62, 142, 208)", border: "rgb(42, 114, 174)" },
	lvl3: { bg: "rgb(53, 73, 182)", border: "rgb(42, 58, 146)" }
} as const;
```

`evStationIcon(bg, border)` generates a 32×32 SVG: a colored circle with the `ev_station` path from `static/icons/ev_station.svg` centered in white on top. The path is embedded directly (not fetched at runtime).

`EvStationIconManager extends MapIconManager` — registers two static images: `ev-station-lvl2` and `ev-station-lvl3`. Called once in `apply()` via `loadIcons()`. No reactive regeneration needed since colors are fixed.

---

## Cluster Renderer (`ev-stations-cluster-renderer.ts`)

Manages two independent GeoJSON cluster sources (one per level). Each level gets three layers:

| Layer ID pattern                     | Type     | Purpose                                               |
| ------------------------------------ | -------- | ----------------------------------------------------- |
| `ev-stations-{level}-cluster-circle` | `circle` | Colored circle at 0.6 alpha, radius scales with count |
| `ev-stations-{level}-cluster-label`  | `symbol` | `point_count_abbreviated` text in white               |
| `ev-stations-{level}-unclustered`    | `symbol` | Individual station icon (`ev-station-{level}`)        |

Cluster sources use `clusterMaxZoom: 9`, `clusterRadius: 40`.

Circle radius: `["step", ["get", "point_count"], 15, 10, 20, 25, 25]`.

**Cluster click** → zooms in to expand (same as monitors).
**Cluster hover** → shows `EvStationClusterTooltip` via `TooltipManager`.
**Unclustered click** → fires `stationClickHandler` passed in from the integration.

Public interface: `apply(stationClickHandler)`, `remove()`, `syncFeatures()`, `unclusteredLayerIds`.

---

## Integration (`ev-stations-map-integration.svelte.ts`)

```ts
class EvStationsMapIntegration extends MapGeoJSONIntegration<EvStationMarkerProperties> {
	referenceId = "ev-stations";
	enabled: boolean = $state(false);
	clustered: boolean = $state(true);

	displayOptions = {
		lvl2: new MapDisplayOption("Level 2", true),
		lvl3: new MapDisplayOption("Level 3", true)
	};

	private currentPopup: Popup | null = null;
}
```

**Features derivation** — `$derived.by()` maps `evStationsManager.lvl2Stations` and `lvl3Stations` into `EvStationMapFeature[]`. Returns `[]` while data is not yet fetched. `ev_connector_types` is `JSON.stringify`-ed.

**`featuresByLevel`** — derived record `{ lvl2: [...], lvl3: [...] }` filtered by display option visibility. Consumed by the cluster renderer.

**Click handling** — `handleStationClick: ClickHandler` closes `currentPopup` (if any) and mounts a new `EvStationTooltip` via a `mountClickPopup` helper (a variant of `mountPopup` in `utils.ts` that sets `closeButton: true` instead of `false`). Satisfies "one tooltip at a time" without a map-level close listener — closing the previous happens inside the handler; users can dismiss via the close button.

**`$effect` responsibilities** (inside `$effect.root`):

- Watch `displayOptions.lvl2.value` / `lvl3.value` — call `evStationsManager.fetchLvl2Stations()` / `fetchLvl3Stations()` when toggled on (only if not yet fetched — guard on `lvl2Stations === undefined`).
- Watch `featuresByLevel` — sync cluster sources when data changes.
- Watch `features` — sync unclustered source when data changes (when not clustered).
- Watch `clustered` + data arrival — re-`apply()` when mode switches.

**`apply()`** — registers click handler for unclustered layers, delegates to renderer in clustered mode or calls `super.apply()` + registers click handler in unclustered mode.

**`mapLayer` / `mapSource`** — used in unclustered mode only (clustered mode bypasses these via the renderer).

---

## Tooltip Components

### `EvStationTooltip.svelte`

Props: `feature: EvStationMapFeature`

Parses `ev_connector_types` from JSON. Layout (Tailwind, no Bulma):

```
Station Name (bold header)

[Facility Type badge]  [Network badge]

Phone (tel: link)   |  Hours (access_days_time split on "|" or ";")
Address (maps link) |

Access detail code (danger badge, if present)
Cards accepted (Lucide CreditCard icon + name per card)
Connector types (Lucide Zap icon + type per connector)
Pricing (split on ";" then "and")
```

Material Symbols spans (`credit_card` → `CreditCard`, `electrical_services` → `Zap`) replaced with Lucide icons.

### `EvStationClusterTooltip.svelte`

Props: `feature: EvStationClusterMapFeature`

Shows level label ("Level 2" or "Level 3") and station count. No async data fetching — all data is on `feature.properties`.

---

## Display Options (`EvStationsDisplayOptions.svelte`)

Wraps in `<DisplayOption>`:

```
EV Stations              ← bold underlined title
[toggle] Marker Clusters ← bound to evStationsMapIntegration.clustered
[check]  Level 2         ← bound to displayOptions.lvl2.value
[check]  Level 3         ← bound to displayOptions.lvl3.value
```

Fetch side-effects live in the integration's `$effect`, not in this component. This component only binds to display option values.

Wired into the app menu alongside `MonitorsDisplayOptions` and `MapLayersDisplayOptions` — exact parent location (`Menu.svelte` or `App.svelte`) confirmed during implementation.

---

## Data Flow

```
EvStationsDisplayOptions (toggle Level 2/3)
  → displayOptions.lvl2/lvl3.value changes
  → integration $effect calls evStationsManager.fetchLvl2/3Stations() (once)
  → evStationsManager.lvl2Stations / lvl3Stations populated
  → features / featuresByLevel derived
  → cluster renderer syncFeatures() OR mapManager.setDataSource()
  → markers appear on map

User clicks unclustered marker
  → clickManager fires handleStationClick
  → currentPopup?.remove()
  → mountPopup(EvStationTooltip, { feature }, lngLat) with closeButton: true
  → currentPopup = new popup

User clicks cluster
  → cluster click handler zooms in

User hovers cluster
  → TooltipManager fires → mountPopup(EvStationClusterTooltip, { feature }, lngLat)
```
