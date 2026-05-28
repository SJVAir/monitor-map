# HMS Smoke Map Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the imported Vue/Leaflet HMS smoke stub with a working Svelte 5 + MapTiler SDK integration that renders smoke density polygons on the map.

**Architecture:** `HMSSmokeMapIntegration` extends `MapGeoJSONIntegration<SmokeProperties>`, deriving features reactively from `hmsManager.smoke`. A single `fill` layer uses maplibre match expressions to apply per-density colors and opacity. The singleton is registered before `hmsFireMapIntegration` in `App.svelte` so smoke renders below fire via natural layer stacking order.

**Tech Stack:** Svelte 5 runes, MapTiler SDK (maplibre-gl), `@sjvair/sdk/hms`, TypeScript

---

## File Map

| Action | File |
|--------|------|
| Replace | `src/lib/hms/hms-smoke-map-integration.svelte.ts` |
| Modify | `src/App.svelte` |
| Modify | `src/lib/components/MapLayersDisplayOptions.svelte` |

---

### Task 1: Implement HMSSmokeMapIntegration

**Files:**
- Replace: `src/lib/hms/hms-smoke-map-integration.svelte.ts`

- [ ] **Step 1: Replace the file contents**

Overwrite `src/lib/hms/hms-smoke-map-integration.svelte.ts` with:

```ts
import type { Map as MaptilerMap } from "@maptiler/sdk";
import type { Feature, MultiPolygon } from "geojson";
import type { HMSSmokeGeoJSON } from "@sjvair/sdk/hms";
import { mapManager } from "$lib/map/map.svelte.ts";
import { MapGeoJSONIntegration } from "$lib/map/integrations/map-geojson-integration.svelte.ts";
import { hmsManager } from "./hms.svelte.ts";

type SmokeProperties = {
	id: string;
	density: HMSSmokeGeoJSON["density"];
};

class HMSSmokeMapIntegration extends MapGeoJSONIntegration<SmokeProperties> {
	referenceId = "hms-smoke";
	enabled: boolean = $state(true);

	get features(): Array<Feature<MultiPolygon, SmokeProperties>> {
		return (hmsManager.smoke ?? []).map((d) => ({
			type: "Feature",
			properties: {
				id: d.id,
				density: d.density
			},
			geometry: d.geometry as MultiPolygon
		}));
	}

	get mapLayer(): Parameters<MaptilerMap["addLayer"]>[0] {
		return {
			id: this.referenceId,
			type: "fill",
			source: this.referenceId,
			layout: {},
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
		};
	}

	get mapSource(): Parameters<MaptilerMap["addSource"]>[1] {
		return {
			type: "geojson",
			promoteId: "id",
			data: { type: "FeatureCollection", features: this.features }
		};
	}

	constructor() {
		super();

		$effect.root(() => {
			$effect(() => {
				const features = this.features;
				if (!mapManager.map || !this.enabled) return;
				mapManager.setDataSource(this.referenceId, features);
			});
		});
	}

	apply() {
		if (!mapManager.map) return;
		this.remove();
		mapManager.map.addSource(this.referenceId, this.mapSource);
		super.apply();
	}
}

export const hmsSmokeMapIntegration = new HMSSmokeMapIntegration();
export type { HMSSmokeMapIntegration };
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: no errors referencing `hms-smoke-map-integration.svelte.ts`. Fix any type errors before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/lib/hms/hms-smoke-map-integration.svelte.ts
git commit -m "feat: implement HMS smoke map integration for MapTiler/Svelte 5"
```

---

### Task 2: Wire up the integration

**Files:**
- Modify: `src/App.svelte`
- Modify: `src/lib/components/MapLayersDisplayOptions.svelte`

- [ ] **Step 1: Register the integration in App.svelte**

In `src/App.svelte`, add the import after the existing HMS fire import (line 23):

```ts
import { hmsSmokeMapIntegration } from "$lib/hms/hms-smoke-map-integration.svelte.ts";
```

Then in the `integrations` array (currently lines 28–35), add `hmsSmokeMapIntegration` **before** `hmsFireMapIntegration`. Order matters — layers are applied in array order, so smoke must be registered first to render below fire:

```ts
const integrations: Array<SomeMapIntegration> = [
	baseLayerSeperator,
	collocationSitesMapIntegration,
	windMapIntegration,
	hmsSmokeMapIntegration,
	hmsFireMapIntegration,
	monitorsMapIntegration,
	evStationsMapIntegration
];
```

- [ ] **Step 2: Add HMS Smoke toggle to MapLayersDisplayOptions**

In `src/lib/components/MapLayersDisplayOptions.svelte`, add the import:

```ts
import { hmsSmokeMapIntegration } from "$lib/hms/hms-smoke-map-integration.svelte";
```

Then add a toggle after the HMS Fire toggle:

```svelte
<ToggleSwitch id="hms-smoke" label="HMS Smoke" bind:value={hmsSmokeMapIntegration.enabled}
></ToggleSwitch>
```

The full updated script block:

```svelte
<script lang="ts">
	import DisplayOption from "$lib/components/DisplayOption.svelte";
	import ToggleSwitch from "$lib/components/ToggleSwitch.svelte";
	import { windMapIntegration } from "$lib/wind/wind.svelte";
	import { collocationSitesMapIntegration } from "$lib/collocation-sites/collocations-map-integration.svelte";
	import { monitorsManager } from "$lib/monitors/monitors.svelte";
	import { hmsFireMapIntegration } from "$lib/hms/hms-fire-map-integration.svelte";
	import { hmsSmokeMapIntegration } from "$lib/hms/hms-smoke-map-integration.svelte";
</script>
```

And the full updated template:

```svelte
<DisplayOption>
	<p class="text-lg font-bold whitespace-nowrap underline">Map Layers</p>
	<ToggleSwitch id="wind" label="Wind" bind:value={windMapIntegration.enabled}></ToggleSwitch>
	{#if monitorsManager.pollutant === "pm25"}
		<ToggleSwitch
			id="collocation-sites"
			label="Collocation Sites"
			bind:value={collocationSitesMapIntegration.enabled}
		></ToggleSwitch>
	{/if}
	<ToggleSwitch id="hms-fire" label="HMS Fire" bind:value={hmsFireMapIntegration.enabled}
	></ToggleSwitch>
	<ToggleSwitch id="hms-smoke" label="HMS Smoke" bind:value={hmsSmokeMapIntegration.enabled}
	></ToggleSwitch>
</DisplayOption>
```

- [ ] **Step 3: Type-check**

```bash
npm run check
```

Expected: no errors. Fix any type errors before continuing.

- [ ] **Step 4: Run the dev server and verify visually**

```bash
npm run dev
```

Open the app in a browser. Verify:
1. The "HMS Smoke" toggle appears in the Map Layers menu
2. Toggling it off removes the smoke layer from the map
3. Toggling it back on restores the smoke layer
4. Smoke polygons render below fire markers (if both are visible)
5. Light/medium/heavy density areas show progressively darker gray fills

- [ ] **Step 5: Commit**

```bash
git add src/App.svelte src/lib/components/MapLayersDisplayOptions.svelte
git commit -m "feat: wire HMS smoke integration into app and map layers menu"
```
