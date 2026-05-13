# Monitor Click Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking an unclustered monitor icon navigates to `/monitor/:id` and zooms the map to that monitor; clicking a cluster bubble zooms to the level where the cluster splits.

**Architecture:** A new `ClickManager` singleton registers a single `map.on("click")` listener and dispatches to the correct handler using `queryRenderedFeatures`, which returns features sorted by layer stack order (topmost first). The cluster renderer owns click registration for cluster-mode layers; the monitor integration handles the non-clustered single layer. Navigation is injected via a public `onMonitorClick` callback on `MonitorsMapIntegration` so library code stays router-agnostic; `App.svelte` wires in `navigate`.

**Tech Stack:** MapTiler SDK 4 (MapLibre GL JS under the hood), Svelte 5 runes, sv-router, TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/map/integrations/click-manager.ts` | **Create** | `ClickManager` class + `clickManager` singleton |
| `src/lib/monitors/monitors-cluster-renderer.ts` | **Modify** | Register/unregister click handlers per type in `apply()`/`remove()` |
| `src/lib/monitors/monitors-map-integration.svelte.ts` | **Modify** | `onMonitorClick` callback, `handleMonitorClick` method, non-clustered click registration |
| `src/App.svelte` | **Modify** | Wire `navigate('/monitor/:id')` into `monitorsMapIntegration.onMonitorClick` |

---

## Task 1: Create ClickManager

**Files:**
- Create: `src/lib/map/integrations/click-manager.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/map/integrations/click-manager.ts
import type { MapGeoJSONFeature, MapMouseEvent } from "@maptiler/sdk";
import { mapManager } from "../map.svelte.ts";

export type ClickHandler = (features: MapGeoJSONFeature[], evt: MapMouseEvent & object) => void;

interface ClickRegistration {
	layerIds: string[];
	handler: ClickHandler;
}

class ClickManager {
	private registrations: ClickRegistration[] = [];
	private isListening = false;

	register(layerIds: string[], handler: ClickHandler): void {
		this.registrations.push({ layerIds, handler });
		this.ensureListener();
	}

	unregister(layerIds: string[]): void {
		const set = new Set(layerIds);
		this.registrations = this.registrations.filter(
			(r) => !r.layerIds.some((id) => set.has(id))
		);
		if (this.registrations.length === 0) {
			this.removeListener();
		}
	}

	private ensureListener(): void {
		if (this.isListening || !mapManager.map) return;
		mapManager.map.on("click", this.handleClick);
		this.isListening = true;
	}

	private removeListener(): void {
		if (!this.isListening || !mapManager.map) return;
		mapManager.map.off("click", this.handleClick);
		this.isListening = false;
	}

	private handleClick = (evt: MapMouseEvent & object): void => {
		if (!mapManager.map) return;
		const allLayerIds = this.registrations.flatMap((r) => r.layerIds);
		const features = mapManager.map.queryRenderedFeatures(evt.point, { layers: allLayerIds });
		if (!features.length) return;

		const winningLayerId = features[0].layer.id;
		const registration = this.registrations.find((r) => r.layerIds.includes(winningLayerId));
		if (!registration) return;

		const ownFeatures = features.filter((f) => registration.layerIds.includes(f.layer.id));
		registration.handler(ownFeatures, evt);
	};
}

export const clickManager = new ClickManager();
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/map/integrations/click-manager.ts
git commit -m "feat: add ClickManager singleton for global map click dispatch"
```

---

## Task 2: Add click handlers to MonitorsClusterRenderer

**Files:**
- Modify: `src/lib/monitors/monitors-cluster-renderer.ts`

- [ ] **Step 1: Add imports**

In `monitors-cluster-renderer.ts`, add to the existing import block:

```typescript
import { clickManager, type ClickHandler } from "$lib/map/integrations/click-manager.ts";
import type { GeoJSONSource } from "@maptiler/sdk";
import type { Point } from "geojson";
```

The `GeoJSONSource` import goes inside the existing `@maptiler/sdk` import group. Add it there:

```typescript
import type {
	ExpressionSpecification,
	FilterSpecification,
	GeoJSONSource,
	MapLayerEventType,
	Popup
} from "@maptiler/sdk";
```

- [ ] **Step 2: Add `makeClusterClickHandler` private method**

Add this method to the `MonitorsClusterRenderer` class, after the existing private methods:

```typescript
private makeClusterClickHandler(sourceId: string): ClickHandler {
	return async (features) => {
		const feature = features[0];
		if (!feature?.properties?.cluster_id) return;
		const source = mapManager.map?.getSource(sourceId) as GeoJSONSource | undefined;
		if (!source) return;
		const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id);
		const coords = (feature.geometry as Point).coordinates as [number, number];
		mapManager.map?.easeTo({ center: coords, zoom });
	};
}
```

- [ ] **Step 3: Update `apply()` signature and register click handlers**

Change the signature of `apply()` to accept the monitor click handler:

```typescript
apply(monitorClickHandler: ClickHandler): void {
```

Then, inside the `for` loop in `apply()`, directly after the existing tooltip registration block, add:

```typescript
		clickManager.register([unclustered], monitorClickHandler);
		clickManager.register([icon], this.makeClusterClickHandler(sourceId));
```

The full loop body (after your edits) should look like this:

```typescript
	for (const [[type, features], index] of sortedEntries.map((e, i) => [e, i] as const)) {
		const sourceId = `${this.ctx.referenceId}-${type}`;

		mapManager.map.addSource(sourceId, {
			type: "geojson",
			promoteId: "id",
			data: { type: "FeatureCollection", features },
			cluster: true,
			clusterRadius: 40,
			clusterMaxZoom: 9,
			clusterProperties: {
				sumValues: ["+", ["to-number", ["get", "value"]], 0]
			}
		});

		this.monitorTypeIconsLayer(sourceId, AVG_EXPR, getTypeShape(type));
		this.clusterCountLayer(sourceId, AVG_EXPR);
		this.unclusteredLayer(sourceId);

		const { icon, unclustered } = this.clusterLayerIds(sourceId);

		if (!this.ctx.tooltipManager.has(icon)) {
			this.ctx.tooltipManager.register(icon, clusterTooltip, index);
		}
		if (!this.ctx.tooltipManager.has(unclustered)) {
			this.ctx.tooltipManager.register(unclustered, monitorTooltip, index);
		}

		clickManager.register([unclustered], monitorClickHandler);
		clickManager.register([icon], this.makeClusterClickHandler(sourceId));

		this._clusterTypes.push(type);
	}
```

- [ ] **Step 4: Unregister click handlers in `remove()`**

Add unregister calls at the top of the `for` loop in `remove()`, before the existing layer-removal code:

```typescript
remove(): void {
	if (!mapManager.map) return;

	for (const type of this._clusterTypes) {
		const sourceId = `${this.ctx.referenceId}-${type}`;
		const layers = this.clusterLayerIds(sourceId);
		clickManager.unregister([layers.unclustered]);
		clickManager.unregister([layers.icon]);
		for (const layerId of Object.values(layers)) {
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

- [ ] **Step 5: Type-check**

```bash
npm run check
```

Expected: one error — `this.renderer.apply()` in `monitors-map-integration.svelte.ts` now requires an argument. That will be fixed in Task 3.

- [ ] **Step 6: Commit**

```bash
git add src/lib/monitors/monitors-cluster-renderer.ts
git commit -m "feat: register monitor and cluster click handlers in MonitorsClusterRenderer"
```

---

## Task 3: Wire click handling into MonitorsMapIntegration

**Files:**
- Modify: `src/lib/monitors/monitors-map-integration.svelte.ts`

- [ ] **Step 1: Add imports**

Add to the existing `@maptiler/sdk` import:

```typescript
import {
	type ExpressionSpecification,
	type FilterSpecification,
	type MapGeoJSONFeature,
	type Map as MaptilerMap
} from "@maptiler/sdk";
```

Change the `geojson` import to also pull in `Point`:

```typescript
import type { Geometry, Point } from "geojson";
```

Add the click-manager import (place it with the other `$lib` imports):

```typescript
import { clickManager } from "$lib/map/integrations/click-manager.ts";
```

- [ ] **Step 2: Add `onMonitorClick` and `handleMonitorClick` to the class**

Inside the `MonitorsMapIntegration` class, add these two properties after the existing `displayOptions` block:

```typescript
	onMonitorClick: ((id: string) => void) | null = null;

	private handleMonitorClick = (features: MapGeoJSONFeature[]): void => {
		const sorted = [...features].sort(
			(a, b) => (b.properties?.order ?? 0) - (a.properties?.order ?? 0)
		);
		const top = sorted[0];
		if (!top?.properties?.id) return;
		this.onMonitorClick?.(top.properties.id as string);
		const coords = (top.geometry as Point).coordinates as [number, number];
		mapManager.map?.easeTo({
			center: coords,
			zoom: Math.max(mapManager.map.getZoom(), 12)
		});
	};
```

- [ ] **Step 3: Update `apply()` — clustered branch**

In the `if (this.clustered)` branch of `apply()`, add `clickManager.unregister([this.referenceId])` after the source/layer removal lines, and pass `this.handleMonitorClick` to `this.renderer.apply(...)`.

The full updated `apply()` method:

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
			});
		} else {
			this.tooltipManager.disable();
			this.renderer.remove();
			this.tooltipManager.enable();
			clickManager.unregister([this.referenceId]);
			super.apply();
			clickManager.register([this.referenceId], this.handleMonitorClick);
		}
	}
```

- [ ] **Step 4: Update `remove()`**

Replace the existing `remove()` method:

```typescript
	remove() {
		clickManager.unregister([this.referenceId]);
		this.renderer.remove();
		super.remove();
	}
```

- [ ] **Step 5: Type-check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/monitors/monitors-map-integration.svelte.ts
git commit -m "feat: add onMonitorClick callback and wire click registration in MonitorsMapIntegration"
```

---

## Task 4: Wire navigation in App.svelte

**Files:**
- Modify: `src/App.svelte`

- [ ] **Step 1: Import `navigate` from the router**

In `App.svelte`'s `<script>` block, the existing import is:

```typescript
import { route } from "./router";
```

Change it to:

```typescript
import { navigate, route } from "./router";
```

- [ ] **Step 2: Set `onMonitorClick` on the integration**

Directly after the existing `monitorsManager.init()` and `collocationSitesManager.init()` lines, add:

```typescript
monitorsMapIntegration.onMonitorClick = (id: string) => navigate(`/monitor/${id}`);
```

- [ ] **Step 3: Type-check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.svelte
git commit -m "feat: wire monitor click navigation in App.svelte"
```

---

## Task 5: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify unclustered monitor click (zoom out first)**

Zoom to a level where monitors are unclustered (zoom ≥ 10 typically). Click any monitor icon. Confirm:
- The URL changes to `/monitor/<id>`
- The map zooms in (or stays at the current zoom if already ≥ 12) and centers on the clicked monitor

- [ ] **Step 3: Verify cluster click**

Zoom out until clusters appear. Click a cluster bubble. Confirm:
- The map zooms to exactly the level where the cluster splits (it should not navigate to any route)
- If still clustered after zooming, click again — each click should zoom one cluster level in

- [ ] **Step 4: Verify overlapping icons**

Find a location where two monitors are very close (or artificially zoom in on a dense area). Confirm that clicking the visually topmost icon selects that monitor, not one behind it.

- [ ] **Step 5: Verify mode switching**

Toggle between clustered and non-clustered mode via the display options menu. Confirm clicks still behave correctly in both modes with no duplicate navigation or zoom events.
