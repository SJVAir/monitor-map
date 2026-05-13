# Design: Extract MonitorsClusterRenderer

**Date:** 2026-05-13
**Branch:** feat/monitor-details

## Problem

`MonitorsMapIntegration` handles two distinct rendering strategies — unclustered symbol layer and per-type MapTiler cluster sources — in a single ~477-line file. The cluster-specific code (source creation, three-layer stack per type, icon expressions, sync helpers) is interleaved with the reactive data derivation and display option logic, making the file harder to reason about. As more clustered integrations are added (e.g. EV charging stations), having a well-bounded cluster renderer as a pattern is useful even if no shared base class is warranted.

## Decision

Extract all cluster-specific map manipulation into a new plain class `MonitorsClusterRenderer`. No new base class is introduced — EV charging stations clustering is simple enough (single source, count badge) that a shared abstraction would be premature. The collocations integration's unused `clustered` flag is removed as part of this work.

## New File: `src/lib/monitors/monitors-cluster-renderer.ts`

A plain TypeScript class (no Svelte runes). Receives a context interface so the integration doesn't need to be passed directly, avoiding circular type references.

### Context interface

```typescript
interface MonitorsClusterContext {
	referenceId: string;
	featuresByType: Record<string, MonitorMapFeature[]>;
	filters: FilterSpecification;
	clusterIconThresholds: SJVAirEntryLevel[];
	beforeLayer?: string;
	tooltipManager: TooltipManager;
}
```

`MonitorsMapIntegration` satisfies this interface structurally — no `implements` declaration needed.

### Public API

| Method             | Responsibility                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `apply()`          | Build all per-type cluster sources and their three layers (icon, average, unclustered); register tooltips |
| `remove()`         | Tear down all cluster layers and sources; clear tracked type list                                         |
| `syncFeatures()`   | Push updated `featuresByType` to existing cluster sources                                                 |
| `syncFilter()`     | Push updated filter expression to each unclustered sublayer                                               |
| `syncThresholds()` | Push updated icon image and text-color expressions to cluster icon/average layers                         |

### Private helpers (moved wholesale from integration)

- `clusterLayerIds(sourceId)` → `{ icon, average, unclustered }`
- `buildClusterIconExpression(avgExpr, shape)` → icon step expression using AQI level thresholds
- `clusterTextColorExpr(avgExpr)` → text-color case expression (black below threshold, white above)
- `get clusterTextColorThreshold()` → numeric value from `clusterIconThresholds[2]`
- `monitorTypeIconsLayer(sourceId, avgExpr, shape)` → adds the cluster icon symbol layer
- `clusterCountLayer(sourceId, avgExpr)` → adds the average-value text layer
- `unclusteredLayer(sourceId)` → adds the unclustered point symbol layer

`AVG_EXPR` becomes a module-level constant in the renderer file.

## Changes to `monitors-map-integration.svelte.ts`

- Add `private renderer: MonitorsClusterRenderer` field, instantiated in the constructor with `this` as context
- Remove all private cluster methods listed above
- `apply()` delegates to `this.renderer.apply()` / `this.renderer.remove()` (branching on `this.clustered` unchanged)
- `remove()` delegates to `this.renderer.remove()` before `super.remove()`
- The three cluster-related `$effect`s in the constructor call `this.renderer.syncFeatures()`, `this.renderer.syncFilter()`, and `this.renderer.syncThresholds()` instead of inline imperative code

## Changes to `collocations-map-integration.svelte.ts`

- Remove `clustered: boolean = $state(true)` — it was dead code copied from the monitors integration

## Out of Scope

- No changes to `MapGeoJSONIntegration`, `MapLayerIntegration`, or any other base class
- No shared cluster base class or mixin
- EV charging stations integration is a future task
