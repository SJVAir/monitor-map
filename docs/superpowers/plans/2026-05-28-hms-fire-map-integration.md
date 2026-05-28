# HMS Fire Map Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the HMS fire layer from Vue + Leaflet to Svelte 5 + MapTiler SDK, using DBSCAN pre-processing to group satellite hotspots into fire events, with a dual-layer display (fire-group icons at low zoom, individual hotspot icons at zoom ≥ 10).

**Architecture:** `hmsManager.loadFire()` fetches raw hotspots, runs DBSCAN (via `@turf/clusters-dbscan`) to group nearby points into fire events, and stores both the raw points and the computed groups as reactive state. `HMSFireMapIntegration` (extending `MapIconLayerIntegration`) manages two MapLibre sources/layers — `hms-fire-groups` (maxzoom 10) and `hms-fire-hotspots` (minzoom 10) — and registers 5 pre-generated SVG fire icons keyed by FRP tier.

**Tech Stack:** Svelte 5 runes, MapTiler SDK (MapLibre-GL underneath), `@turf/clusters-dbscan`, `@turf/helpers`, TypeScript

---

## File Map

| File                                             | Action  | Responsibility                                                             |
| ------------------------------------------------ | ------- | -------------------------------------------------------------------------- |
| `src/lib/map/icons.ts`                           | Modify  | Add `fireIcon(color, size)` SVG generator                                  |
| `src/lib/hms/hms-fire-icon-manager.ts`           | Create  | FRP tier constants, `getTierIconId()`, `HMSFireIconManager`                |
| `src/lib/hms/hms.svelte.ts`                      | Modify  | Add `HMSFireGroup` type, `fireGroups` state, DBSCAN processing             |
| `src/lib/hms/hms-fire-map-integration.svelte.ts` | Rewrite | Two sources/layers, derived features, reactive data sync                   |
| `src/App.svelte`                                 | Modify  | Import integration + manager, add to integrations array, call `loadFire()` |

---

## Task 1: Install `@turf/clusters-dbscan` and add `fireIcon()` to `icons.ts`

**Files:**

- Modify: `src/lib/map/icons.ts`

- [ ] **Step 1: Install the package**

```bash
npm install @turf/clusters-dbscan@^7.3.5
```

Expected: package added to `package.json` dependencies, no errors.

- [ ] **Step 2: Add `fireIcon()` to `src/lib/map/icons.ts`**

Append after the existing `asDataURI` export. The path data comes from `static/icons/emergency_heat.svg` (viewBox `0 -960 960 960`):

```ts
export function fireIcon(color: string, size: number): string {
	return `<svg width="${size}" height="${size}" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg" fill="${color}"><path d="M200-400q0 52 21 98.5t60 81.5q-1-5-1-9v-9q0-32 12-60t35-51l113-111 113 111q23 23 35 51t12 60v9q0 4-1 9 39-35 60-81.5t21-98.5q0-50-18.5-94.5T608-574q-20 13-42 19.5t-45 6.5q-62 0-107.5-41T361-690q-39 33-69 68.5t-50.5 72Q221-513 210.5-475T200-400Zm240 52-57 56q-11 11-17 25t-6 29q0 32 23.5 55t56.5 23q33 0 56.5-23t23.5-55q0-16-6-29.5T497-292l-57-56Zm0-492v132q0 34 23.5 57t57.5 23q18 0 33.5-7.5T582-658l18-22q74 42 117 117t43 163q0 134-93 227T440-80q-134 0-227-93t-93-227q0-129 86.5-245T440-840Zm400 320q-17 0-28.5-11.5T800-560q0-17 11.5-28.5T840-600q17 0 28.5 11.5T880-560q0 17-11.5 28.5T840-520Zm-40-120v-200h80v200h-80Z"/></svg>`;
}
```

- [ ] **Step 3: Type-check**

```bash
npm run check
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/map/icons.ts package.json package-lock.json
git commit -m "feat: add fireIcon() to icons.ts and install @turf/clusters-dbscan"
```

---

## Task 2: Create `HMSFireIconManager`

**Files:**

- Create: `src/lib/hms/hms-fire-icon-manager.ts`

- [ ] **Step 1: Create the file**

```ts
import { asDataURI, fireIcon } from "$lib/map/icons.ts";
import { MapIconManager } from "$lib/map/integrations/map-icon-manager.ts";

type FRPTier = "sm" | "md" | "lg" | "xl" | "xxl";

export const HMS_FIRE_DBSCAN_EPSILON = 5;
export const HMS_FIRE_DBSCAN_MIN_POINTS = 1;

const FRP_TIERS: Record<FRPTier, { color: string; size: number }> = {
	sm: { color: "#FFD700", size: 14 },
	md: { color: "#FF8C00", size: 18 },
	lg: { color: "#FF4500", size: 22 },
	xl: { color: "#DC143C", size: 26 },
	xxl: { color: "#8B0000", size: 30 }
};

export function getTierIconId(frp: number): string {
	if (frp < 10) return "hms-fire-sm";
	if (frp < 50) return "hms-fire-md";
	if (frp < 150) return "hms-fire-lg";
	if (frp < 350) return "hms-fire-xl";
	return "hms-fire-xxl";
}

export class HMSFireIconManager extends MapIconManager {
	constructor() {
		super();
		for (const [tier, { color, size }] of Object.entries(FRP_TIERS) as [
			FRPTier,
			{ color: string; size: number }
		][]) {
			const img = new Image(size, size);
			img.src = asDataURI(fireIcon(color, size));
			this.register(`hms-fire-${tier}`, img);
		}
	}
}
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/hms/hms-fire-icon-manager.ts
git commit -m "feat: add HMSFireIconManager with 5 FRP tier icons"
```

---

## Task 3: Update `hms.svelte.ts` with DBSCAN processing

**Files:**

- Modify: `src/lib/hms/hms.svelte.ts`

- [ ] **Step 1: Replace the file contents**

```ts
import {
	getHMSFire,
	getHMSSmoke,
	type HMSFireGeoJSON,
	type HMSSmokeGeoJSON
} from "@sjvair/sdk/hms";
import clustersDbscan from "@turf/clusters-dbscan";
import { featureCollection, point } from "@turf/helpers";
import { HMS_FIRE_DBSCAN_EPSILON, HMS_FIRE_DBSCAN_MIN_POINTS } from "./hms-fire-icon-manager.ts";

export interface HMSFireGroup {
	id: string;
	coordinates: [number, number];
	avgFrp: number;
	count: number;
}

class HmsManager {
	smoke: Array<HMSSmokeGeoJSON> | undefined = $state();
	fire: Array<HMSFireGeoJSON> | undefined = $state();
	fireGroups: Array<HMSFireGroup> | undefined = $state();

	async loadSmoke() {
		this.smoke = await getHMSSmoke();
	}

	async loadFire() {
		const raw = await getHMSFire();
		const filtered = raw.filter((d) => d.frp !== null);
		this.fire = filtered;
		this.fireGroups = computeFireGroups(filtered);
	}
}

function computeFireGroups(fires: HMSFireGeoJSON[]): HMSFireGroup[] {
	if (!fires.length) return [];

	const fc = featureCollection(
		fires.map((d) =>
			point(d.geometry.coordinates as [number, number], { fireId: d.id, frp: d.frp! })
		)
	);

	const clustered = clustersDbscan(fc, HMS_FIRE_DBSCAN_EPSILON, {
		minPoints: HMS_FIRE_DBSCAN_MIN_POINTS,
		units: "kilometers"
	});

	const groups = new Map<string, { frps: number[]; lngs: number[]; lats: number[] }>();

	for (const feature of clustered.features) {
		const props = feature.properties as {
			dbscan: "core" | "edge" | "noise";
			cluster?: number;
			fireId: string;
			frp: number;
		};
		const key = props.dbscan === "noise" ? `noise-${props.fireId}` : `cluster-${props.cluster}`;
		const [lng, lat] = feature.geometry.coordinates as [number, number];
		const entry = groups.get(key) ?? { frps: [], lngs: [], lats: [] };
		entry.frps.push(props.frp);
		entry.lngs.push(lng);
		entry.lats.push(lat);
		groups.set(key, entry);
	}

	return Array.from(groups.entries()).map(([key, { frps, lngs, lats }]) => ({
		id: `hms-fire-group-${key}`,
		coordinates: [
			lngs.reduce((s, v) => s + v, 0) / lngs.length,
			lats.reduce((s, v) => s + v, 0) / lats.length
		] as [number, number],
		avgFrp: frps.reduce((s, v) => s + v, 0) / frps.length,
		count: frps.length
	}));
}

export const hmsManager = new HmsManager();
export type { HmsManager as HMSManager };
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

If `clustersDbscan` is flagged as a default import error, try the named import instead:

```ts
import { clustersDbscan } from "@turf/clusters-dbscan";
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/hms/hms.svelte.ts
git commit -m "feat: add DBSCAN fire grouping to hmsManager"
```

---

## Task 4: Rewrite `hms-fire-map-integration.svelte.ts`

**Files:**

- Rewrite: `src/lib/hms/hms-fire-map-integration.svelte.ts`

- [ ] **Step 1: Replace the file contents entirely**

```ts
import type { Map as MaptilerMap } from "@maptiler/sdk";
import type { Feature } from "geojson";
import type { Point } from "geojson";
import { mapManager } from "$lib/map/map.svelte.ts";
import { MapIconLayerIntegration } from "$lib/map/integrations/map-geojson-integration.svelte.ts";
import { hmsManager } from "./hms.svelte.ts";
import { HMSFireIconManager, getTierIconId } from "./hms-fire-icon-manager.ts";

interface FireGroupProperties {
	id: string;
	icon: string;
	avgFrp: number;
	count: number;
}

interface FireHotspotProperties {
	id: string;
	icon: string;
	frp: number;
}

const HOTSPOT_SOURCE_ID = "hms-fire-hotspots";

class HMSFireMapIntegration extends MapIconLayerIntegration<FireGroupProperties> {
	referenceId = "hms-fire-groups";
	enabled: boolean = $state(true);
	icons = new HMSFireIconManager();

	get features(): Array<Feature<Point, FireGroupProperties>> {
		return this.groupFeatures;
	}

	get mapLayer(): Parameters<MaptilerMap["addLayer"]>[0] {
		return {
			id: this.referenceId,
			type: "symbol",
			source: this.referenceId,
			maxzoom: 10,
			layout: {
				"icon-image": ["get", "icon"],
				"icon-allow-overlap": true,
				"icon-ignore-placement": true
			},
			paint: {}
		};
	}

	get mapSource(): Parameters<MaptilerMap["addSource"]>[1] {
		return {
			type: "geojson",
			promoteId: "id",
			data: { type: "FeatureCollection", features: this.groupFeatures }
		};
	}

	private get groupFeatures(): Array<Feature<Point, FireGroupProperties>> {
		return (hmsManager.fireGroups ?? []).map((g) => ({
			type: "Feature",
			properties: {
				id: g.id,
				icon: getTierIconId(g.avgFrp),
				avgFrp: g.avgFrp,
				count: g.count
			},
			geometry: { type: "Point", coordinates: g.coordinates }
		}));
	}

	private get hotspotFeatures(): Array<Feature<Point, FireHotspotProperties>> {
		return (hmsManager.fire ?? []).map((d) => ({
			type: "Feature",
			properties: {
				id: d.id,
				icon: getTierIconId(d.frp!),
				frp: d.frp!
			},
			geometry: d.geometry as Point
		}));
	}

	private get hotspotSource(): Parameters<MaptilerMap["addSource"]>[1] {
		return {
			type: "geojson",
			promoteId: "id",
			data: { type: "FeatureCollection", features: this.hotspotFeatures }
		};
	}

	private get hotspotLayer(): Parameters<MaptilerMap["addLayer"]>[0] {
		return {
			id: HOTSPOT_SOURCE_ID,
			type: "symbol",
			source: HOTSPOT_SOURCE_ID,
			minzoom: 10,
			layout: {
				"icon-image": ["get", "icon"],
				"icon-allow-overlap": true,
				"icon-ignore-placement": true
			},
			paint: {}
		};
	}

	constructor() {
		super();

		$effect.root(() => {
			$effect(() => {
				const features = this.groupFeatures;
				if (!mapManager.map) return;
				mapManager.setDataSource(this.referenceId, features);
			});

			$effect(() => {
				const features = this.hotspotFeatures;
				if (!mapManager.map) return;
				mapManager.setDataSource(HOTSPOT_SOURCE_ID, features);
			});
		});
	}

	apply() {
		if (!mapManager.map) return;
		this.icons.loadIcons().then(() => {
			if (!mapManager.map) return;
			this.remove();
			mapManager.map.addSource(this.referenceId, this.mapSource);
			mapManager.map.addLayer(this.mapLayer, this.beforeLayer);
			mapManager.map.addSource(HOTSPOT_SOURCE_ID, this.hotspotSource);
			mapManager.map.addLayer(this.hotspotLayer, this.beforeLayer);
		});
	}

	remove() {
		if (mapManager.map?.getLayer(HOTSPOT_SOURCE_ID)) {
			mapManager.map.removeLayer(HOTSPOT_SOURCE_ID);
		}
		if (mapManager.map?.getSource(HOTSPOT_SOURCE_ID)) {
			mapManager.map.removeSource(HOTSPOT_SOURCE_ID);
		}
		super.remove();
	}
}

export const hmsFireMapIntegration = new HMSFireMapIntegration();
export type { HMSFireMapIntegration };
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/hms/hms-fire-map-integration.svelte.ts
git commit -m "feat: implement HMSFireMapIntegration with dual-layer display"
```

---

## Task 5: Wire up in `App.svelte` and verify

**Files:**

- Modify: `src/App.svelte`

- [ ] **Step 1: Add imports to the script block**

In `src/App.svelte`, add these two imports alongside the existing ones (after the `evStationsMapIntegration` import line):

```ts
import { hmsManager } from "$lib/hms/hms.svelte.ts";
import { hmsFireMapIntegration } from "$lib/hms/hms-fire-map-integration.svelte.ts";
```

- [ ] **Step 2: Add `hmsFireMapIntegration` to the integrations array**

The current `integrations` array is:

```ts
const integrations: Array<SomeMapIntegration> = [
	baseLayerSeperator,
	collocationSitesMapIntegration,
	windMapIntegration,
	monitorsMapIntegration,
	evStationsMapIntegration
];
```

Add `hmsFireMapIntegration` before `monitorsMapIntegration` so fire icons render below monitor icons:

```ts
const integrations: Array<SomeMapIntegration> = [
	baseLayerSeperator,
	collocationSitesMapIntegration,
	windMapIntegration,
	hmsFireMapIntegration,
	monitorsMapIntegration,
	evStationsMapIntegration
];
```

- [ ] **Step 3: Call `hmsManager.loadFire()` alongside existing init calls**

Find this block (around line 34):

```ts
monitorsManager.init();
collocationSitesManager.init();
```

Add the fire load call:

```ts
monitorsManager.init();
collocationSitesManager.init();
hmsManager.loadFire();
```

- [ ] **Step 4: Type-check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 5: Start dev server and verify**

```bash
npm run dev
```

Open the app in a browser. Verify:

- Fire icons appear on the map at low zoom (fire group centroids, sized and colored by avg FRP)
- At zoom ≥ 10, individual hotspot icons appear instead of group icons
- Zooming back out returns to group icons
- Fire icons use the correct color gradient (yellow for low FRP, deep red for high FRP)
- Monitor icons still render correctly (no regression)

- [ ] **Step 6: Commit**

```bash
git add src/App.svelte
git commit -m "feat: wire up HMS fire layer in App.svelte"
```
