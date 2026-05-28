# HMS Fire Map Integration — Design Spec

**Date:** 2026-05-28
**Branch:** feat/hms-fire

## Overview

Convert the legacy Vue + Leaflet HMS fire layer to Svelte 5 + MapTiler SDK, following the established monitors module patterns. The layer shows satellite-detected fire hotspots (HMS Fire data) on the map, grouped into fire events via DBSCAN pre-processing. At low zoom, one icon per fire event (DBSCAN centroid). At zoom ≥ 10, individual satellite hotspots are visible.

No tooltip, no click handler, no display options panel required.

---

## File Structure

```
src/lib/hms/
  hms.svelte.ts                        ← update: add fireGroups state + DBSCAN processing
  hms-fire-icon-manager.ts             ← new: 5-tier icon generation + registration
  hms-fire-map-integration.svelte.ts   ← rewrite: two sources/layers, derived features

src/lib/map/
  icons.ts                             ← update: add fireIcon(color, size) function

static/icons/
  emergency_heat.svg                   ← unchanged (path data extracted into fireIcon())
```

---

## Data Processing — HmsManager

### New state

```ts
interface HMSFireGroup {
	id: string;
	coordinates: [number, number]; // centroid [lng, lat]
	avgFrp: number;
	count: number;
}

class HmsManager {
	smoke: Array<HMSSmokeGeoJSON> | undefined = $state();
	fire: Array<HMSFireGeoJSON> | undefined = $state(); // individual hotspots (frp !== null)
	fireGroups: Array<HMSFireGroup> | undefined = $state(); // DBSCAN-aggregated fire events
}
```

### `loadFire()` flow

1. Fetch raw data via `getHMSFire()`
2. Filter out entries where `frp === null`
3. Run `clustersDbscan()` from `@turf/clusters-dbscan` with:
   - `epsilon: 5` (km) — exported as `HMS_FIRE_DBSCAN_EPSILON`
   - `minPoints: 1` — exported as `HMS_FIRE_DBSCAN_MIN_POINTS`
4. Group clustered features by cluster id; compute centroid and average FRP per group
5. Outlier points (DBSCAN noise, cluster id `-1`) each become their own single-point group
6. Assign `this.fire` (filtered raw array) and `this.fireGroups` (computed groups)

The `HMSFireGroup.id` is derived from the cluster id, prefixed `hms-fire-group-`. Outlier groups use the raw point's `id`.

---

## Icon System

### `fireIcon()` in `src/lib/map/icons.ts`

```ts
export function fireIcon(color: string, size: number): string {
	// Returns SVG string with emergency_heat path data,
	// parameterized by fill color and pixel size.
	// viewBox preserved from static/icons/emergency_heat.svg: "0 -960 960 960"
}
```

### FRP tier mapping

Exported from `hms-fire-icon-manager.ts`:

| Tier  | FRP range       | Size | Color     |
| ----- | --------------- | ---- | --------- |
| `sm`  | frp < 10        | 14px | `#FFD700` |
| `md`  | 10 ≤ frp < 50   | 18px | `#FF8C00` |
| `lg`  | 50 ≤ frp < 150  | 22px | `#FF4500` |
| `xl`  | 150 ≤ frp < 350 | 26px | `#DC143C` |
| `xxl` | frp ≥ 350       | 30px | `#8B0000` |

Icon ids: `hms-fire-sm`, `hms-fire-md`, `hms-fire-lg`, `hms-fire-xl`, `hms-fire-xxl`.

### `HMSFireIconManager`

Extends `MapIconManager`. Constructor pre-registers all 5 icons synchronously — no `$effect` needed since icons have no reactive dependencies.

```ts
export function getTierIconId(frp: number): string { ... }

export class HMSFireIconManager extends MapIconManager {
  constructor() {
    super();
    for (const [tier, { color, size }] of Object.entries(FRP_TIERS)) {
      const img = new Image(size, size);
      img.src = asDataURI(fireIcon(color, size));
      this.register(`hms-fire-${tier}`, img);
    }
  }
}
```

---

## Integration Architecture

### Class

`HMSFireMapIntegration` extends `MapLayerIntegration`. `referenceId = "hms-fire-groups"` (the primary/groups layer). `mapLayer` and `mapSource` satisfy the abstract requirements for the groups source.

### Sources & layers

| Id                  | Source                  | Layer type | Zoom constraint |
| ------------------- | ----------------------- | ---------- | --------------- |
| `hms-fire-groups`   | `hmsManager.fireGroups` | `symbol`   | `maxzoom: 10`   |
| `hms-fire-hotspots` | `hmsManager.fire`       | `symbol`   | `minzoom: 10`   |

Both layers use `"icon-image": ["get", "icon"]`. The `icon` property on each GeoJSON feature is set to the tier icon id during feature derivation.

### GeoJSON feature properties

**Groups feature:**

```ts
{
	id: string; // HMSFireGroup.id
	icon: string; // getTierIconId(avgFrp)
	avgFrp: number;
	count: number;
}
```

**Hotspot feature:**

```ts
{
	id: string; // HMSFireGeoJSON.id
	icon: string; // getTierIconId(frp)
	frp: number;
}
```

### Reactive effects (`$effect.root` in constructor)

- `hmsManager.fireGroups` changes → `mapManager.setDataSource("hms-fire-groups", features)`
- `hmsManager.fire` changes → `mapManager.setDataSource("hms-fire-hotspots", features)`
- `enabled` flips → set `visibility` on both layers

### `apply()`

1. Call `this.icons.loadIcons()` (registers images with the map)
2. Add `hms-fire-groups` source + layer (via `super.apply()` for the primary)
3. Add `hms-fire-hotspots` source + layer manually

### `remove()`

Removes both layers and both sources. Calls `super.remove()` for the primary, then explicitly removes the hotspots layer/source.

### Export & wiring

```ts
export const hmsFireMapIntegration = new HMSFireMapIntegration();
```

`App.svelte` (or equivalent startup file) adds `hmsManager.loadFire()` to the mount sequence alongside the existing `monitorsManager.init()` call.

---

## Out of Scope

- Tooltip on hover
- Click-to-navigate
- Display options toggle (visibility toggle can be added later via `enabled`)
- Auto-refresh interval (HMS data is daily; one load on mount is sufficient for now)
