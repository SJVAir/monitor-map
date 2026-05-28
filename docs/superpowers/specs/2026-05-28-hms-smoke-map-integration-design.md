# HMS Smoke Map Integration Design

**Date:** 2026-05-28
**Branch:** feat/hms-smoke

## Overview

Convert the imported Vue/Leaflet HMS smoke integration into a Svelte 5 + MapTiler SDK
integration that fits the established plugin pattern used by `hms-fire-map-integration.svelte.ts`
and the rest of the map integration modules.

## Architecture

`HMSSmokeMapIntegration` extends `MapGeoJSONIntegration<SmokeProperties>` directly.
No icon manager is needed — smoke features are polygons, not points.

```
MapIntegration
  └── MapLayerIntegration
        └── MapGeoJSONIntegration<SmokeProperties>
              └── HMSSmokeMapIntegration
```

A singleton instance `hmsSmokeMapIntegration` is exported at module level, matching
the fire integration's export pattern.

### Local types

```ts
type SmokeProperties = {
    id: string;
    density: HMSSmokeGeoJSON["density"]; // "light" | "medium" | "heavy"
};
```

## Class Members

| Member | Value / Behavior |
|--------|-----------------|
| `referenceId` | `"hms-smoke"` |
| `enabled` | `$state(true)` |
| `beforeLayer` | `"hms-fire"` — renders below fire markers |
| `features` | derived from `hmsManager.smoke`, maps each item to `Feature<MultiPolygon, SmokeProperties>` |
| `mapSource` | GeoJSON FeatureCollection of `this.features`, `promoteId: "id"` |
| `mapLayer` | `fill` type with match-expression paint (see below) |
| `apply()` | `this.remove()` → `addSource` → `super.apply()` |

## Layer Paint

Single `fill` layer. No stroke.

| Density | `fill-color` | `fill-opacity` |
|---------|-------------|----------------|
| light   | `#bfc8c3`   | 0.2            |
| medium  | `#757b78`   | 0.3            |
| heavy   | `#333634`   | 0.4            |

Implemented as maplibre match expressions so all density levels share one source and one layer:

```ts
paint: {
    "fill-color": ["match", ["get", "density"],
        "light", "#bfc8c3",
        "medium", "#757b78",
        "#333634"
    ],
    "fill-opacity": ["match", ["get", "density"],
        "light", 0.2,
        "medium", 0.3,
        0.4
    ]
}
```

## Data Flow

1. `hmsManager.loadSmoke()` is called from `hmsManager.init()` in `App.svelte` — no data
   fetching in the integration itself.
2. `hmsManager.smoke` is `$state` — the integration's `features` getter derives from it reactively.
3. A `$effect.root` in the constructor watches `this.features` and calls
   `mapManager.setDataSource(this.referenceId, features)` to keep the map source in sync
   as smoke data loads asynchronously.

## Lifecycle

- **apply()**: `this.remove()` (clean slate) → `map.addSource(referenceId, mapSource)` →
  `super.apply()` (adds the fill layer via `MapLayerIntegration.apply()`)
- **remove()**: inherited from `MapGeoJSONIntegration` — removes the layer, then the source

## File

Replaces `src/lib/hms/hms-smoke-map-integration.svelte.ts` entirely. No new files.
