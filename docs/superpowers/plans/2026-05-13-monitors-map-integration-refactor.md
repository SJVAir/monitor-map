# monitors-map-integration Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove duplicated expressions and template strings from `MonitorsMapIntegration` and shared tooltip code across map integrations.

**Architecture:** Four targeted changes — a shared `mountPopup` utility, an `AVG_EXPR` constant, a `clusterLayerIds()` private method, and a `clusterTextColorExpr()` private method — each eliminating one category of duplication without changing the class structure or effect graph.

**Tech Stack:** Svelte 5, TypeScript, MapTiler SDK, Vite

---

## Files

| File                                                               | Change                                                                      |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `src/lib/map/utils.ts`                                             | Add `mountPopup` export                                                     |
| `src/lib/monitors/monitors-map-integration.svelte.ts`              | Use `mountPopup`; add `AVG_EXPR`, `clusterLayerIds`, `clusterTextColorExpr` |
| `src/lib/collocation-sites/collocations-map-integration.svelte.ts` | Use `mountPopup`                                                            |

---

## Task 1: Add `mountPopup` to `src/lib/map/utils.ts`

**Files:**

- Modify: `src/lib/map/utils.ts`

- [ ] **Step 1: Add imports and `mountPopup` function**

Open `src/lib/map/utils.ts`. Add these imports at the top:

```ts
import { mount, unmount } from "svelte";
import type { Component } from "svelte";
import { Popup } from "@maptiler/sdk";
import type { LngLat } from "@maptiler/sdk";
```

Then add the function after the existing exports:

```ts
export function mountPopup<Props extends Record<string, any>>(
	Component: Component<Props>,
	props: Props,
	lngLat: LngLat
): Popup {
	const container = document.createElement("div");
	const instance = mount(Component, { target: container, props });
	const popup = new Popup({ closeButton: false, closeOnClick: false, maxWidth: "none" })
		.setLngLat(lngLat)
		.setDOMContent(container);
	popup.on("close", () => unmount(instance));
	return popup;
}
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: no errors related to `utils.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/map/utils.ts
git commit -m "feat: add mountPopup utility to map utils"
```

---

## Task 2: Use `mountPopup` in `monitors-map-integration.svelte.ts`

**Files:**

- Modify: `src/lib/monitors/monitors-map-integration.svelte.ts`

- [ ] **Step 1: Add `mountPopup` import**

In the imports block, add `mountPopup` from utils:

```ts
import { mountPopup } from "$lib/map/utils.ts";
```

- [ ] **Step 2: Replace `clusterTooltip`**

Replace the entire `clusterTooltip` function (lines 39–59) with:

```ts
function clusterTooltip(evt: MapLayerEventType["mousemove"] & object): Popup | void {
	const feature = evt.features?.[0] as unknown as MonitorClusterMapFeature | undefined;
	if (!feature) return;
	return mountPopup(MonitorClusterTooltip, { feature }, evt.lngLat);
}
```

- [ ] **Step 3: Replace `monitorTooltip`**

Replace the entire `monitorTooltip` function (lines 61–81) with:

```ts
function monitorTooltip(evt: MapLayerEventType["mousemove"] & object): Popup | void {
	const features = evt.features as unknown as Array<MonitorMapFeature> | undefined;
	const feature = features?.sort((a, b) => b.properties.order - a.properties.order)[0];
	if (!feature) return;
	return mountPopup(MonitorTooltip, { feature }, evt.lngLat);
}
```

- [ ] **Step 4: Remove the now-unused `mount` and `unmount` imports**

`mount` and `unmount` are no longer used directly in this file — both calls moved into `mountPopup`. `untrack` is still used in the constructor. Update the svelte import to:

```ts
import { untrack } from "svelte";
```

- [ ] **Step 5: Type-check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/monitors/monitors-map-integration.svelte.ts
git commit -m "refactor: use mountPopup in monitor tooltip functions"
```

---

## Task 3: Use `mountPopup` in `collocations-map-integration.svelte.ts`

**Files:**

- Modify: `src/lib/collocation-sites/collocations-map-integration.svelte.ts`

- [ ] **Step 1: Add `mountPopup` import**

Add to the imports block:

```ts
import { mountPopup } from "$lib/map/utils.ts";
```

- [ ] **Step 2: Replace `collocationTooltip`**

Replace the entire `collocationTooltip` function (lines 17–37) with:

```ts
function collocationTooltip(evt: MapLayerEventType["mousemove"] & object): Popup | void {
	const feature = evt.features?.[0] as unknown as CollocationSiteMapFeature | undefined;
	if (!feature) return;
	return mountPopup(CollocationTooltip, { feature }, evt.lngLat);
}
```

- [ ] **Step 3: Remove unused `mount` and `unmount` imports**

The `mount` and `unmount` named imports from `"svelte"` are no longer used directly. Update the import line:

```ts
import { untrack } from "svelte";
```

- [ ] **Step 4: Type-check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/collocation-sites/collocations-map-integration.svelte.ts
git commit -m "refactor: use mountPopup in collocation tooltip function"
```

---

## Task 4: Extract `AVG_EXPR` constant in `monitors-map-integration.svelte.ts`

**Files:**

- Modify: `src/lib/monitors/monitors-map-integration.svelte.ts`

- [ ] **Step 1: Add module-level constant after the `filters` object**

After the closing brace of the `filters` object (around line 37), add:

```ts
const AVG_EXPR: ExpressionSpecification = [
	"/",
	["get", "sumValues"],
	["max", ["get", "point_count"], 1]
];
```

- [ ] **Step 2: Replace the `avgExpr` local variable in `applyClusters`**

In `applyClusters()`, find:

```ts
const avgExpr: ExpressionSpecification = [
	"/",
	["get", "sumValues"],
	["max", ["get", "point_count"], 1]
	//["max", ["get", "countValues"], 1]
];
```

Remove those lines. All references to `avgExpr` in `applyClusters` now refer to `AVG_EXPR` — update the call sites:

```ts
this.monitorTypeIconsLayer(sourceId, AVG_EXPR, getTypeShape(type));
this.clusterCountLayer(sourceId, AVG_EXPR);
```

- [ ] **Step 3: Replace the `avgExpr` local variable in the icon-expression `$effect`**

In the constructor's icon-expression `$effect`, find:

```ts
const avgExpr: ExpressionSpecification = [
	"/",
	["get", "sumValues"],
	["max", ["get", "point_count"], 1]
];
```

Remove those lines. Update all references in the same effect to use `AVG_EXPR` directly:

```ts
$effect(() => {
	const thresholds = this.clusterIconThresholds;
	if (!mapManager.map || !this.clustered || !thresholds.length) return;

	for (const type of this._clusterTypes) {
		const sourceId = `${this.referenceId}-${type}`;
		const iconLayerId = `${sourceId}-cluster-icon`;
		const avgLayerId = `${sourceId}-cluster-average`;

		if (mapManager.map.getLayer(iconLayerId)) {
			mapManager.map.setLayoutProperty(
				iconLayerId,
				"icon-image",
				this.buildClusterIconExpression(AVG_EXPR, getTypeShape(type))
			);
		}
		if (mapManager.map.getLayer(avgLayerId)) {
			mapManager.map.setPaintProperty(avgLayerId, "text-color", [
				"case",
				["<=", AVG_EXPR, this.clusterTextColorThreshold],
				"#000000",
				"#FFFFFF"
			]);
		}
	}
});
```

(The layer ID strings will be cleaned up in Task 5; leave them as-is for now.)

- [ ] **Step 4: Type-check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/monitors/monitors-map-integration.svelte.ts
git commit -m "refactor: extract AVG_EXPR as module-level constant"
```

---

## Task 5: Add `clusterLayerIds` and normalise `sourceId` usage

**Files:**

- Modify: `src/lib/monitors/monitors-map-integration.svelte.ts`

- [ ] **Step 1: Add `clusterLayerIds` private method to the class**

Add this method anywhere in the class body (e.g., before `buildClusterIconExpression`):

```ts
private clusterLayerIds(sourceId: string) {
	return {
		icon: `${sourceId}-cluster-icon`,
		average: `${sourceId}-cluster-average`,
		unclustered: `${sourceId}-unclustered`
	};
}
```

- [ ] **Step 2: Update `removeClusters`**

Replace the body of `removeClusters()`:

```ts
private removeClusters() {
	if (!mapManager.map) return;

	for (const type of this._clusterTypes) {
		const sourceId = `${this.referenceId}-${type}`;
		const layers = this.clusterLayerIds(sourceId);
		for (const layerId of [layers.icon, layers.average, layers.unclustered]) {
			if (mapManager.map.getLayer(layerId)) {
				mapManager.map.removeLayer(layerId);
			}
		}
		if (mapManager.map.getSource(sourceId)) {
			mapManager.map.removeSource(sourceId);
		}
	}

	this._clusterTypes = [];
}
```

- [ ] **Step 3: Update the filter `$effect` in the constructor**

Replace the filter effect:

```ts
$effect(() => {
	const filter = this.filters;
	if (!mapManager.map) return;

	if (this.clustered) {
		for (const type of this._clusterTypes) {
			const sourceId = `${this.referenceId}-${type}`;
			const { unclustered } = this.clusterLayerIds(sourceId);
			if (mapManager.map.getLayer(unclustered)) {
				mapManager.map.setFilter(unclustered, [
					"all",
					filter as ExpressionSpecification,
					["!", ["has", "point_count"]]
				]);
			}
		}
	} else {
		if (mapManager.map.getLayer(this.referenceId)) {
			mapManager.map.setFilter(this.referenceId, filter);
		}
	}
});
```

- [ ] **Step 4: Update the icon-expression `$effect` in the constructor**

Replace the icon-expression effect:

```ts
$effect(() => {
	const thresholds = this.clusterIconThresholds;
	if (!mapManager.map || !this.clustered || !thresholds.length) return;

	for (const type of this._clusterTypes) {
		const sourceId = `${this.referenceId}-${type}`;
		const { icon, average } = this.clusterLayerIds(sourceId);

		if (mapManager.map.getLayer(icon)) {
			mapManager.map.setLayoutProperty(
				icon,
				"icon-image",
				this.buildClusterIconExpression(AVG_EXPR, getTypeShape(type))
			);
		}
		if (mapManager.map.getLayer(average)) {
			mapManager.map.setPaintProperty(average, "text-color", [
				"case",
				["<=", AVG_EXPR, this.clusterTextColorThreshold],
				"#000000",
				"#FFFFFF"
			]);
		}
	}
});
```

- [ ] **Step 5: Update the feature-sync `$effect` in the constructor**

This effect also loops over `_clusterTypes` but inlines the sourceId template. Add the `sourceId` variable for consistency:

```ts
$effect(() => {
	const featuresByType = this.featuresByType;
	if (!mapManager.map || !this.clustered) return;

	for (const type of this._clusterTypes) {
		const sourceId = `${this.referenceId}-${type}`;
		mapManager.setDataSource(sourceId, featuresByType[type] ?? []);
	}
});
```

- [ ] **Step 7: Update `monitorTypeIconsLayer`**

```ts
private monitorTypeIconsLayer(sourceId: string, avgExpr: ExpressionSpecification, shape: string) {
	const { icon } = this.clusterLayerIds(sourceId);
	mapManager.map?.addLayer(
		{
			id: icon,
			type: "symbol",
			source: sourceId,
			filter: ["has", "point_count"],
			layout: {
				"icon-image": this.buildClusterIconExpression(avgExpr, shape),
				"icon-size": ["step", ["get", "point_count"], 1.3, 10, 1.6, 25, 2.0],
				"icon-ignore-placement": true,
				"icon-allow-overlap": true
			},
			paint: {
				"icon-opacity": 0.8
			}
		},
		this.beforeLayer
	);
}
```

- [ ] **Step 8: Update `clusterCountLayer`**

```ts
private clusterCountLayer(sourceId: string, avgExpr: ExpressionSpecification) {
	const { average } = this.clusterLayerIds(sourceId);
	mapManager.map?.addLayer(
		{
			id: average,
			type: "symbol",
			source: sourceId,
			filter: ["has", "point_count"],
			layout: {
				"text-field": ["to-string", ["round", avgExpr]],
				"text-size": 12,
				"text-ignore-placement": true,
				"text-allow-overlap": true
			},
			paint: {
				"text-color": [
					"case",
					["<=", avgExpr, this.clusterTextColorThreshold],
					"#000000",
					"#FFFFFF"
				]
			}
		},
		this.beforeLayer
	);
}
```

- [ ] **Step 9: Update `unclusteredLayer`**

```ts
private unclusteredLayer(sourceId: string) {
	const { unclustered } = this.clusterLayerIds(sourceId);
	mapManager.map?.addLayer(
		{
			id: unclustered,
			type: "symbol",
			source: sourceId,
			filter: ["all", this.filters as ExpressionSpecification, ["!", ["has", "point_count"]]],
			layout: {
				"symbol-sort-key": ["coalesce", ["get", "order"], 0],
				"icon-allow-overlap": true,
				"icon-ignore-placement": true,
				"icon-image": ["get", "icon"],
				"icon-size": 1
			},
			paint: {}
		},
		this.beforeLayer
	);
}
```

- [ ] **Step 10: Update tooltip registration in `applyClusters`**

In `applyClusters`, `sourceId` is already declared as `\`${this.referenceId}-${type}\``at the top of the loop. Add a`layers` destructure and replace the tooltip registration block:

```ts
const { icon, unclustered } = this.clusterLayerIds(sourceId);

if (!this.tooltipManager.has(icon)) {
	this.tooltipManager.register(icon, clusterTooltip, index);
}
if (!this.tooltipManager.has(unclustered)) {
	this.tooltipManager.register(unclustered, monitorTooltip, index);
}
```

- [ ] **Step 11: Type-check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 12: Commit**

```bash
git add src/lib/monitors/monitors-map-integration.svelte.ts
git commit -m "refactor: extract clusterLayerIds helper and normalise sourceId usage"
```

---

## Task 6: Add `clusterTextColorExpr` private method

**Files:**

- Modify: `src/lib/monitors/monitors-map-integration.svelte.ts`

- [ ] **Step 1: Add `clusterTextColorExpr` private method to the class**

Add this method alongside `clusterLayerIds`:

```ts
private clusterTextColorExpr(avgExpr: ExpressionSpecification): ExpressionSpecification {
	return ["case", ["<=", avgExpr, this.clusterTextColorThreshold], "#000000", "#FFFFFF"];
}
```

- [ ] **Step 2: Update `clusterCountLayer` to use the method**

Replace the `"text-color"` paint property inside `clusterCountLayer`:

```ts
paint: {
	"text-color": this.clusterTextColorExpr(avgExpr)
}
```

- [ ] **Step 3: Update the icon-expression `$effect` to use the method**

In the icon-expression `$effect`, replace the inline text-color expression:

```ts
if (mapManager.map.getLayer(average)) {
	mapManager.map.setPaintProperty(average, "text-color", this.clusterTextColorExpr(AVG_EXPR));
}
```

- [ ] **Step 4: Type-check and lint**

```bash
npm run check && npm run lint
```

Expected: no errors or warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/monitors/monitors-map-integration.svelte.ts
git commit -m "refactor: extract clusterTextColorExpr helper method"
```
