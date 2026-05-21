# Design: monitors-map-integration refactor

**Date:** 2026-05-13
**Branch:** feat/monitor-details
**Scope:** `src/lib/monitors/monitors-map-integration.svelte.ts`, `src/lib/collocation-sites/collocations-map-integration.svelte.ts`, `src/lib/map/utils.ts`

## Goal

Remove duplicated expressions and template strings inside `MonitorsMapIntegration` without introducing new abstractions beyond what each change requires. All four changes are self-contained and can be applied independently.

## Changes

### 1. `mountPopup` factory function (shared map utility)

**Problem:** `clusterTooltip` and `monitorTooltip` in `monitors-map-integration.svelte.ts`, and `collocationTooltip` in `collocations-map-integration.svelte.ts`, all share identical popup-creation bodies — create container, `mount` component, construct `Popup`, register `unmount` on close.

**Solution:** A generic `mountPopup` function is added to `src/lib/map/utils.ts`. Each tooltip function retains its own feature-extraction logic and delegates popup creation to `mountPopup`.

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

Lives in `src/lib/map/utils.ts` (not in either integration file) so any current or future integration can import it. Named `mountPopup` rather than `createTooltipPopup` so click handlers and other non-tooltip callers can use it without the name feeling wrong.

---

### 2. `AVG_EXPR` module-level constant

**Problem:** The cluster average expression is defined identically in both `applyClusters()` and the icon-expression `$effect`.

**Solution:** A single module-level constant.

```ts
const AVG_EXPR: ExpressionSpecification = [
	"/",
	["get", "sumValues"],
	["max", ["get", "point_count"], 1]
];
```

Both call sites reference `AVG_EXPR` directly.

---

### 3. `clusterLayerIds` private method + consistent `sourceId`

**Problem:** The three cluster layer IDs (`-cluster-icon`, `-cluster-average`, `-unclustered`) are assembled from template strings in four separate places. `sourceId` is also computed inconsistently — some effects inline `${this.referenceId}-${type}`, others assign a variable.

**Solution:** A private method returns all three IDs as a named object.

```ts
private clusterLayerIds(sourceId: string) {
    return {
        icon:        `${sourceId}-cluster-icon`,
        average:     `${sourceId}-cluster-average`,
        unclustered: `${sourceId}-unclustered`
    };
}
```

Every loop over `_clusterTypes` (in `removeClusters`, the filter `$effect`, and the icon-expression `$effect`) opens with:

```ts
const sourceId = `${this.referenceId}-${type}`;
const layers = this.clusterLayerIds(sourceId);
```

The private layer-adding methods (`monitorTypeIconsLayer`, `clusterCountLayer`, `unclusteredLayer`) each use only one layer ID internally. They receive `sourceId` and can destructure the relevant key from `clusterLayerIds(sourceId)` for consistency, eliminating their inline template strings too.

---

### 4. `clusterTextColorExpr` private method

**Problem:** The text-color expression `["case", ["<=", avgExpr, threshold], "#000000", "#FFFFFF"]` is constructed in both `clusterCountLayer()` and the icon-expression `$effect`.

**Solution:** A private method owns the expression.

```ts
private clusterTextColorExpr(avgExpr: ExpressionSpecification): ExpressionSpecification {
    return ["case", ["<=", avgExpr, this.clusterTextColorThreshold], "#000000", "#FFFFFF"];
}
```

`clusterCountLayer()` and the update `$effect` call `this.clusterTextColorExpr(AVG_EXPR)`.

---

## What is not changing

- Class structure, effect graph, `_clusterTypes` array, `applyClusters`/`removeClusters` split
- `filters` object and derived `filters` property
- `featuresByType`, `features`, `clusterIconThresholds` derived values
- `buildClusterIconExpression`, `clusterTextColorThreshold` getter
- `TooltipManager` registration logic
- Any files outside `monitors-map-integration.svelte.ts`, `collocations-map-integration.svelte.ts`, and `src/lib/map/utils.ts`
