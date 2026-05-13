# Monitor Click Navigation Design

**Date:** 2026-05-13
**Branch:** feat/monitor-details

## Goal

When a user clicks an individual (unclustered) monitor icon on the map, navigate to `/monitor/:id` and zoom the map to that monitor's location. When a user clicks a cluster bubble, zoom to the level where the cluster splits.

## Background

MapLibre's per-layer click events (`map.on("click", layerId, handler)`) fire once per intersecting layer and use bounding-box hit-tests, which causes duplicate fires when layers overlap and gives no guaranteed ordering. The correct approach is a single global `map.on("click")` handler that calls `map.queryRenderedFeatures(point, { layers })`, which returns all features at the click point sorted by **layer stack order — topmost layer first**. This gives a single, authoritatively ordered list from which the visual winner is always `features[0]`.

## Architecture

### New file: `src/lib/map/integrations/click-manager.ts`

Exports a module-level `clickManager` singleton (same pattern as `mapManager`).

**Types:**

```ts
type ClickHandler = (features: MapGeoJSONFeature[], evt: MapMouseEvent) => void;

interface ClickRegistration {
  layerIds: string[];
  handler: ClickHandler;
}
```

**`ClickManager` class:**

- `register(layerIds: string[], handler: ClickHandler): void`
  - Adds a `ClickRegistration` to the internal list.
  - Lazily attaches the single global `map.on("click", this.handleClick)` on first registration.
- `unregister(layerIds: string[]): void`
  - Removes the registration that owns the given layer IDs. Callers always pass the exact same set used when registering.
  - Removes the global listener when the registration list is empty.
- `private handleClick(evt: MapMouseEvent): void`
  - Collects all registered layer IDs.
  - Calls `map.queryRenderedFeatures(evt.point, { layers: allLayerIds })`.
  - Takes `features[0]` to find the winning layer ID.
  - Looks up the registration that owns that layer ID.
  - Passes all features from that registration's layers (filtered from the full result) to the handler.

**Dispatch detail:** The manager passes all features from the winning registration's layers so the handler can perform its own within-layer tie-breaking (e.g., sorting by `order`). This mirrors the existing `monitorTooltip` pattern.

### Changes to `MonitorsClusterRenderer`

`MonitorsClusterRenderer` already owns the full lifecycle of all cluster-mode layers. Click registration lives here too.

**`apply()`** — after adding each monitor type's three layers, register two click handlers with `clickManager`:
- `[monitors-${type}-unclustered]` → `monitorClickHandler`
- `[monitors-${type}-cluster-icon]` → `clusterClickHandler(sourceId)`

**`remove()`** — call `clickManager.unregister([...all unclustered and cluster-icon layer IDs])` before removing layers.

### Changes to `MonitorsMapIntegration`

Handles only the **non-clustered** code path (the `else` branch of `apply()`).

**Non-clustered `apply()`** — after `super.apply()`, call `clickManager.register(["monitors"], monitorClickHandler)`.

**`remove()`** — call `clickManager.unregister(["monitors"])` before `super.remove()`.

Mode switching is already safe: `apply()` calls `this.renderer.remove()` before switching paths, which triggers `remove()` on the renderer and unregisters all cluster-mode handlers before non-clustered handlers are registered (and vice versa).

## Click Behaviors

### Individual monitor click

Handler receives features from the winning unclustered layer. Steps:
1. Sort features by `properties.order` descending (same as `monitorTooltip`).
2. Take `sorted[0]`.
3. Call `navigate('/monitor/${feature.properties.id}')`.
4. Call `map.easeTo({ center: feature.geometry.coordinates, zoom: Math.max(map.getZoom(), 12) })`.
   - Zooms to at least level 12 if not already there; never zooms out.

### Cluster click

Handler receives features from the winning cluster-icon layer. Steps:
1. Take `features[0]`.
2. Read `feature.properties.cluster_id`.
3. Get the GeoJSON source for this type: `map.getSource(sourceId)`.
4. Call `source.getClusterExpansionZoom(cluster_id)` — returns the minimum zoom at which this cluster expands.
5. Call `map.easeTo({ center: feature.geometry.coordinates, zoom: expansionZoom })`.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/map/integrations/click-manager.ts` | New — `ClickManager` class and `clickManager` singleton |
| `src/lib/monitors/monitors-cluster-renderer.ts` | Register/unregister click handlers in `apply()`/`remove()` |
| `src/lib/monitors/monitors-map-integration.svelte.ts` | Register/unregister click handler in non-clustered `apply()`/`remove()` |

## Out of Scope

- Cluster click does not navigate to any route (zoom only).
- No changes to tooltip, cursor, or routing infrastructure.
- No click handling for collocation sites or future integrations (each registers itself when implemented).
