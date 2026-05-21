# Selected Monitor Icon Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scale the selected monitor's unclustered icon up by 30% and back to normal when a different monitor is selected or the detail panel closes.

**Architecture:** MapLibre's `setFeatureState`/`removeFeatureState` API drives the visual change. Both unclustered symbol layers change their `icon-size` expression to read from feature state. `MonitorsMapIntegration` tracks `selectedMonitorId` as reactive state; a `$effect` syncs it to the map via `applySelectedState()`. App.svelte clears selection when the panel closes by watching the existing `panelOpen` derived value.

**Tech Stack:** MapTiler SDK 4 (MapLibre GL JS), Svelte 5 runes, TypeScript

---

## File Map

| File                                                  | Change                                                                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/monitors/monitors-cluster-renderer.ts`       | Add `sourceIds` getter; update `unclusteredLayer()` icon-size expression                                                       |
| `src/lib/monitors/monitors-map-integration.svelte.ts` | Add `selectedMonitorId` state; add `applySelectedState()`; update `handleMonitorClick`, `mapLayer`, `apply()`, and constructor |
| `src/App.svelte`                                      | Add `$effect` to clear `selectedMonitorId` when panel closes                                                                   |

---

## Task 1: Update MonitorsClusterRenderer

**Files:**

- Modify: `src/lib/monitors/monitors-cluster-renderer.ts`

- [ ] **Step 1: Add `sourceIds` getter**

Add this public getter to the `MonitorsClusterRenderer` class, directly after the `remove()` method (after line 115):

```typescript
get sourceIds(): string[] {
	return this._clusterTypes.map((type) => `${this.ctx.referenceId}-${type}`);
}
```

- [ ] **Step 2: Update `unclusteredLayer()` icon-size expression**

In the `unclusteredLayer()` private method, change `"icon-size": 1` to the feature-state expression:

```typescript
	private unclusteredLayer(sourceId: string): void {
		const { unclustered } = this.clusterLayerIds(sourceId);
		mapManager.map?.addLayer(
			{
				id: unclustered,
				type: "symbol",
				source: sourceId,
				filter: ["all", this.ctx.filters as ExpressionSpecification, ["!", ["has", "point_count"]]],
				layout: {
					"symbol-sort-key": ["coalesce", ["get", "order"], 0],
					"icon-allow-overlap": true,
					"icon-ignore-placement": true,
					"icon-image": ["get", "icon"],
					"icon-size": ["case", ["boolean", ["feature-state", "selected"], false], 1.3, 1]
				},
				paint: {}
			},
			this.ctx.beforeLayer
		);
	}
```

- [ ] **Step 3: Type-check**

```bash
npm run check
```

Expected: 0 errors, 1 pre-existing warning.

- [ ] **Step 4: Commit**

```bash
git add src/lib/monitors/monitors-cluster-renderer.ts
git commit -m "feat: add sourceIds getter and feature-state icon-size to unclustered layer"
```

---

## Task 2: Update MonitorsMapIntegration

**Files:**

- Modify: `src/lib/monitors/monitors-map-integration.svelte.ts`

- [ ] **Step 1: Add `selectedMonitorId` property**

After the `onMonitorClick` property (line 53), add:

```typescript
selectedMonitorId: string | null = $state(null);
```

- [ ] **Step 2: Update `handleMonitorClick` to set selection**

Replace the existing `handleMonitorClick` arrow function with this version that sets `selectedMonitorId` immediately before navigating:

```typescript
private handleMonitorClick: ClickHandler = (features) => {
	if (!this.onMonitorClick) return;
	const sorted = [...features].sort(
		(a, b) => (b.properties?.order ?? 0) - (a.properties?.order ?? 0)
	);
	const top = sorted[0];
	if (!top?.properties?.id) return;
	this.selectedMonitorId = top.properties.id as string;
	this.onMonitorClick(this.selectedMonitorId);
	if (top.geometry.type !== "Point") return;
	const coords = top.geometry.coordinates as [number, number];
	mapManager.map?.easeTo({
		center: coords,
		zoom: Math.max(mapManager.map.getZoom(), 12)
	});
};
```

- [ ] **Step 3: Update `mapLayer` icon-size expression**

In the `mapLayer` getter, change `"icon-size": 1` to the feature-state expression:

```typescript
get mapLayer(): Parameters<MaptilerMap["addLayer"]>[0] {
	return {
		id: this.referenceId,
		type: "symbol",
		source: this.referenceId,
		filter: this.filters,
		layout: {
			"symbol-sort-key": ["coalesce", ["get", "order"], 0],
			"icon-allow-overlap": true,
			"icon-ignore-placement": true,
			"icon-image": ["get", "icon"],
			"icon-size": ["case", ["boolean", ["feature-state", "selected"], false], 1.3, 1]
		},
		paint: {}
	};
}
```

- [ ] **Step 4: Add `applySelectedState()` private method**

Add this method after the `remove()` method (after line 273):

```typescript
private applySelectedState(): void {
	if (!mapManager.map) return;
	const sources = this.clustered ? this.renderer.sourceIds : [this.referenceId];
	for (const source of sources) {
		if (!mapManager.map.getSource(source)) continue;
		mapManager.map.removeFeatureState({ source }, "selected");
		if (this.selectedMonitorId) {
			mapManager.map.setFeatureState(
				{ source, id: this.selectedMonitorId },
				{ selected: true }
			);
		}
	}
}
```

`removeFeatureState({ source }, "selected")` clears the `"selected"` key from all features in the source (the `id` field in `FeatureIdentifier` is optional in MapLibre GL JS 4). `setFeatureState` on a source that doesn't contain the given `id` is a no-op, so iterating all cluster sources safely handles the case where we don't know which source holds the selected feature.

- [ ] **Step 5: Add selection `$effect` to constructor**

Inside the `$effect.root(() => { ... })` block in the constructor, add this effect after the last existing `$effect` (after the "Re-apply when clustered mode switches" block, around line 238):

```typescript
// Sync selected icon scale via feature state
$effect(() => {
	void this.selectedMonitorId;
	if (!mapManager.map) return;
	untrack(() => this.applySelectedState());
});
```

- [ ] **Step 6: Update `apply()` to re-apply selection after sources are ready**

Replace the entire `apply()` method with this version. The only additions are the two `applySelectedState()` calls inside the async `.then()` callbacks:

```typescript
apply() {
	if (!mapManager.map) return;

	if (!this.tooltipManager.has(this.referenceId)) {
		this.tooltipManager.register(this.referenceId, monitorTooltip);
	}

	if (this.clustered) {
		if (mapManager.map.getLayer(this.referenceId)) mapManager.map.removeLayer(this.referenceId);
		if (mapManager.map.getSource(this.referenceId)) mapManager.map.removeSource(this.referenceId);
		clickManager.unregister([this.referenceId]);
		this.tooltipManager.disable();
		this.renderer.remove();
		this.icons.loadIcons().then(() => {
			this.renderer.apply(this.handleMonitorClick);
			this.tooltipManager.enable();
			this.applySelectedState();
		});
	} else {
		this.tooltipManager.disable();
		this.renderer.remove();
		this.tooltipManager.enable();
		clickManager.unregister([this.referenceId]);
		super.apply();
		clickManager.register([this.referenceId], this.handleMonitorClick);
		this.icons.loadIcons().then(() => this.applySelectedState());
	}
}
```

**Why the second `loadIcons().then()` in the non-clustered branch works:** `super.apply()` (which calls `MapGeoJSONIntegration.apply()`) also calls `this.icons.loadIcons().then(cb1)`. Since icons are already loaded by the time `apply()` is called a second time, both `.then()` callbacks are enqueued as microtasks in order — `cb1` (add source + layer) runs first, then our `cb2` (`applySelectedState()`) runs after, so the source exists when we call `getSource()`.

- [ ] **Step 7: Type-check**

```bash
npm run check
```

Expected: 0 errors, 1 pre-existing warning.

- [ ] **Step 8: Commit**

```bash
git add src/lib/monitors/monitors-map-integration.svelte.ts
git commit -m "feat: add selectedMonitorId state and applySelectedState for icon scale"
```

---

## Task 3: Clear selection in App.svelte when panel closes

**Files:**

- Modify: `src/App.svelte`

- [ ] **Step 1: Add deselection effect**

`panelOpen` is already defined as `$derived(route.pathname.startsWith("/monitor/"))`. Add a new `$effect` after the existing two `$effect` blocks (after the `panelOpen` resize effect, around line 50):

```typescript
$effect(() => {
	if (!panelOpen) {
		monitorsMapIntegration.selectedMonitorId = null;
	}
});
```

This covers both "user closes the panel" and "user navigates to a different route entirely."

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: 0 errors, 1 pre-existing warning.

- [ ] **Step 3: Commit**

```bash
git add src/App.svelte
git commit -m "feat: clear selectedMonitorId when monitor detail panel closes"
```

---

## Task 4: Manual verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify icon scales up on click**

In clustered mode, zoom in until individual monitor icons appear. Click one. Confirm its icon is visibly larger (~30%) than surrounding icons. The URL should change to `/monitor/<id>`.

- [ ] **Step 3: Verify deselection on different monitor click**

With one monitor selected (scaled up), click a different monitor. Confirm the first icon returns to normal size and the newly clicked icon scales up.

- [ ] **Step 4: Verify deselection on panel close**

With a monitor selected, close the detail panel (e.g., navigate back or use the browser back button). Confirm the scaled-up icon returns to normal size.

- [ ] **Step 5: Verify non-clustered mode**

Toggle to non-clustered mode via the display options menu. Repeat steps 2–4. Confirm the same scaling behavior works in non-clustered mode.

- [ ] **Step 6: Verify mode-switch with active selection**

Select a monitor, then toggle clustered/non-clustered mode. Confirm the selected icon is still scaled up after the mode switch (the `applySelectedState()` call in `apply()` re-applies the feature state after sources are recreated).
