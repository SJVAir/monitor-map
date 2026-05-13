# Selected Monitor Icon Scale Design

**Date:** 2026-05-13
**Branch:** feat/monitor-details

## Goal

The currently selected monitor's unclustered icon scales up by 30% on the map. It scales back to normal when a different monitor is selected or when the detail panel is closed.

## Approach

MapLibre's `setFeatureState` / `removeFeatureState` API. The `icon-size` expression on unclustered symbol layers is changed once (at layer definition time) to read from feature state. All selection changes are driven by imperative `setFeatureState` calls — no source data reload, no layout property updates.

## Architecture

### `icon-size` expression

Both unclustered symbol layers change `"icon-size"` from `1` to:

```json
["case", ["boolean", ["feature-state", "selected"], false], 1.3, 1]
```

- `MonitorsMapIntegration.mapLayer` getter — non-clustered mode
- `MonitorsClusterRenderer.unclusteredLayer()` private method — clustered mode

Cluster bubble layers (`cluster-icon`, `cluster-average`) are unchanged.

### State: `selectedMonitorId`

`MonitorsMapIntegration` gains a public reactive property:

```ts
selectedMonitorId: string | null = $state(null);
```

It is public so `App.svelte` can clear it when the detail panel closes.

**Set:** `handleMonitorClick` sets `this.selectedMonitorId = id` immediately before calling `this.onMonitorClick(id)`.

**Cleared by App.svelte:** A new `$effect` in `App.svelte` watches `route.pathname`. When it no longer starts with `"/monitor/"`, it sets `monitorsMapIntegration.selectedMonitorId = null`.

### `applySelectedState()`

Private method on `MonitorsMapIntegration`. Called whenever feature state needs to be pushed to the map.

```
1. Determine active sources:
   - clustered:     this.renderer.sourceIds   (all monitors-${type} sources)
   - non-clustered: [this.referenceId]         ("monitors")

2. For each source:
   a. removeFeatureState({ source }, "selected")   // clears any prior selection
   b. if selectedMonitorId !== null:
        setFeatureState({ source, id: selectedMonitorId }, { selected: true })
```

`removeFeatureState` without an `id` clears the named key from all features in the source. `setFeatureState` on a source that doesn't contain the given feature ID is a no-op, so iterating all sources is safe.

### `MonitorsClusterRenderer.sourceIds` getter

New public getter:

```ts
get sourceIds(): string[] {
  return this._clusterTypes.map((type) => `${this.ctx.referenceId}-${type}`);
}
```

Used by `applySelectedState()` to reach all active cluster sources without exposing `_clusterTypes` directly.

### Reactive effect

Inside `MonitorsMapIntegration`'s constructor `$effect.root`:

```ts
$effect(() => {
  void this.selectedMonitorId;
  if (!mapManager.map) return;
  untrack(() => this.applySelectedState());
});
```

Fires on every `selectedMonitorId` change and re-applies feature state.

### Re-applying after mode switches

When switching between clustered and non-clustered modes, `apply()` destroys and recreates sources, wiping feature state. `applySelectedState()` is called at the end of both async `apply()` paths:

**Clustered path** (inside `icons.loadIcons().then(...)`):
```ts
this.renderer.apply(this.handleMonitorClick);
this.tooltipManager.enable();
this.applySelectedState();
```

**Non-clustered path** (after `super.apply()`, using a second `loadIcons().then()` which resolves as a microtask after the source/layer are added):
```ts
super.apply();
clickManager.register([this.referenceId], this.handleMonitorClick);
this.icons.loadIcons().then(() => untrack(() => this.applySelectedState()));
```

## Files Changed

| File | Change |
|------|--------|
| `src/lib/monitors/monitors-map-integration.svelte.ts` | `selectedMonitorId` state, `applySelectedState()`, update `handleMonitorClick`, update `apply()` both branches, add selection `$effect` |
| `src/lib/monitors/monitors-cluster-renderer.ts` | `sourceIds` getter, update `unclusteredLayer()` icon-size expression |
| `src/App.svelte` | `$effect` to clear `selectedMonitorId` when route leaves `/monitor/:id` |

## Out of Scope

- No z-order change for the selected icon (scale alone is sufficient)
- No selected state for cluster bubbles
- No animation beyond what MapLibre applies natively to layout property transitions
- `selectedMonitorId` is not synced from the URL on page load (only set by clicking)
