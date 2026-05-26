# EV Stations Map Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Leaflet-based `mod.ts` with a MapTiler integration that renders Level 2 and Level 3 EV chargers as clustered or unclustered map markers, with click-based station tooltips.

**Architecture:** A `EvStationsClusterRenderer` manages per-level GeoJSON cluster sources (mirroring `MonitorsClusterRenderer`). `EvStationsMapIntegration extends MapGeoJSONIntegration` owns icon loading, display option state, and click-popup lifecycle. All tooltip components are Svelte 5 with Tailwind classes.

**Tech Stack:** Svelte 5 runes, MapTiler SDK, `@lucide/svelte`, Tailwind CSS v4, `@tstk/builtin-extensions`.

---

## File Map

| Action  | Path                                                             |
| ------- | ---------------------------------------------------------------- |
| Modify  | `src/lib/map/utils.ts`                                           |
| Modify  | `src/lib/ev-stations/types.ts`                                   |
| Create  | `src/lib/ev-stations/ev-station-icons.ts`                        |
| Create  | `src/lib/ev-stations/ev-stations-cluster-renderer.ts`            |
| Rewrite | `src/lib/ev-stations/ev-stations-map-integration.svelte.ts`      |
| Create  | `src/lib/ev-stations/components/EvStationTooltip.svelte`         |
| Create  | `src/lib/ev-stations/components/EvStationClusterTooltip.svelte`  |
| Create  | `src/lib/ev-stations/components/EvStationsDisplayOptions.svelte` |
| Modify  | `src/App.svelte`                                                 |
| Delete  | `src/lib/ev-stations/mod.ts`                                     |

---

## Task 1: Add `mountClickPopup` to `map/utils.ts`

**Files:**

- Modify: `src/lib/map/utils.ts`

The existing `mountPopup` hardcodes `closeButton: false`. EV station tooltips appear on click and need an explicit dismiss button. Add a second export that is identical except for `closeButton: true`.

- [ ] **Add `mountClickPopup` after `mountPopup`**

Open `src/lib/map/utils.ts`. After the closing `}` of `mountPopup`, append:

```ts
export function mountClickPopup<P extends Record<string, unknown>>(
	component: Component<P>,
	props: P,
	lngLat: LngLat
): Popup {
	const container = document.createElement("div");
	const instance = mount(component, { target: container, props });
	const popup = new Popup({ closeButton: true, closeOnClick: false, maxWidth: "none" })
		.setLngLat(lngLat)
		.setDOMContent(container);
	popup.on("close", () => unmount(instance));
	return popup;
}
```

- [ ] **Type-check**

```bash
npm run check
```

Expected: no new errors.

- [ ] **Commit**

```bash
git add src/lib/map/utils.ts
git commit -m "feat(map): add mountClickPopup helper for click-based popups"
```

---

## Task 2: Update `types.ts` with EV station map types

**Files:**

- Modify: `src/lib/ev-stations/types.ts`

GeoJSON feature properties cannot hold nested arrays, so `ev_connector_types` is stored as `JSON.stringify(string[])` and parsed in the tooltip. Cluster level is derived from `feature.source` at runtime.

- [ ] **Replace the contents of `src/lib/ev-stations/types.ts`**

```ts
import type { Feature, Geometry } from "geojson";
import type { MapGeoJSONFeature } from "@maptiler/sdk";

export interface EvStation {
	access_code: string;
	access_days_time: string;
	access_detail_code: string;
	cards_accepted: null | string;
	date_last_confirmed: string;
	groups_with_access_code: string;
	id: number;
	station_name: string;
	station_phone: string;
	updated_at: string;
	facility_type: string;
	latitude: number;
	longitude: number;
	city: string;
	state: string;
	street_address: string;
	zip: string;
	country: string;
	ev_connector_types: Array<string>;
	ev_dc_fast_num: number;
	ev_network: string;
	ev_pricing: string;
}

export interface EvStationMarkerProperties {
	icon: string;
	id: number;
	level: "lvl2" | "lvl3";
	station_name: string;
	facility_type: string;
	ev_network: string;
	station_phone: string;
	street_address: string;
	city: string;
	state: string;
	zip: string;
	access_days_time: string;
	access_detail_code: string;
	cards_accepted: string | null;
	ev_pricing: string;
	ev_connector_types: string; // JSON.stringify(string[])
}

export type EvStationMapFeature = Feature<Geometry, EvStationMarkerProperties>;

export interface EvStationClusterMapFeature extends MapGeoJSONFeature {
	properties: {
		cluster: true;
		cluster_id: number;
		point_count: number;
		point_count_abbreviated: string | number;
	};
	// level is derived from feature.source: "ev-stations-lvl2" | "ev-stations-lvl3"
}
```

- [ ] **Type-check**

```bash
npm run check
```

Expected: no new errors.

- [ ] **Commit**

```bash
git add src/lib/ev-stations/types.ts
git commit -m "feat(ev-stations): add map feature types"
```

---

## Task 3: Create `ev-station-icons.ts`

**Files:**

- Create: `src/lib/ev-stations/ev-station-icons.ts`

Two static icons: a 32×32 SVG of a colored circle with the `ev_station` Material Symbols path in white. No reactive regeneration needed — colors are fixed.

- [ ] **Create `src/lib/ev-stations/ev-station-icons.ts`**

```ts
import { MapIconManager } from "$lib/map/integrations/map-icon-manager.ts";
import { asDataURI } from "$lib/map/icons.ts";

const EV_STATION_PATH =
	"m340-200 100-160h-60v-120L280-320h60v120ZM240-560h240v-200H240v200Zm0 360h240v-280H240v280Zm-80 80v-640q0-33 23.5-56.5T240-840h240q33 0 56.5 23.5T560-760v280h50q29 0 49.5 20.5T680-410v185q0 17 14 31t31 14q18 0 31.5-14t13.5-31v-375h-10q-17 0-28.5-11.5T720-640v-80h20v-60h40v60h40v-60h40v60h20v80q0 17-11.5 28.5T840-600h-10v375q0 42-30.5 73.5T725-120q-43 0-74-31.5T620-225v-185q0-5-2.5-7.5T610-420h-50v300H160Zm320-80H240h240Z";

export const EV_STATION_LEVELS = {
	lvl2: { bg: "rgb(62, 142, 208)", border: "rgb(42, 114, 174)" },
	lvl3: { bg: "rgb(53, 73, 182)", border: "rgb(42, 58, 146)" }
} as const;

export type EvStationLevel = keyof typeof EV_STATION_LEVELS;

export function evStationIcon(bg: string, border: string): string {
	return `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <circle cx="16" cy="16" r="14" fill="${bg}" stroke="${border}" stroke-width="2"/>
  <svg x="6" y="6" width="20" height="20" viewBox="0 -960 960 960">
    <path d="${EV_STATION_PATH}" fill="white"/>
  </svg>
</svg>`;
}

export class EvStationIconManager extends MapIconManager {
	constructor() {
		super();
		for (const [level, colors] of Object.entries(EV_STATION_LEVELS) as Array<
			[EvStationLevel, (typeof EV_STATION_LEVELS)[EvStationLevel]]
		>) {
			const id = `ev-station-${level}`;
			const icon = new Image(32, 32);
			icon.src = asDataURI(evStationIcon(colors.bg, colors.border));
			this.register(id, icon);
		}
	}
}
```

- [ ] **Type-check**

```bash
npm run check
```

Expected: no new errors.

- [ ] **Commit**

```bash
git add src/lib/ev-stations/ev-station-icons.ts
git commit -m "feat(ev-stations): add icon generator and icon manager"
```

---

## Task 4: Create `ev-stations-cluster-renderer.ts`

**Files:**

- Create: `src/lib/ev-stations/ev-stations-cluster-renderer.ts`

Manages two independent GeoJSON cluster sources (one per level). Each level gets three layers: a circle paint layer for the cluster background, a symbol layer for the count text, and a symbol layer for unclustered individual icons. Cluster click zooms in; cluster hover shows `EvStationClusterTooltip` via `TooltipManager`.

- [ ] **Create `src/lib/ev-stations/ev-stations-cluster-renderer.ts`**

```ts
import type { GeoJSONSource, MapLayerEventType, Popup } from "@maptiler/sdk";
import type { Point } from "geojson";
import { mapManager } from "$lib/map/map.svelte.ts";
import { mountPopup } from "$lib/map/utils.ts";
import { clickManager, type ClickHandler } from "$lib/map/integrations/click-manager.ts";
import { TooltipManager } from "$lib/map/integrations/tooltip.svelte.ts";
import { EV_STATION_LEVELS, type EvStationLevel } from "./ev-station-icons.ts";
import type { EvStationClusterMapFeature, EvStationMapFeature } from "./types.ts";
import EvStationClusterTooltip from "./components/EvStationClusterTooltip.svelte";

export interface EvStationsClusterContext {
	referenceId: string;
	featuresByLevel: Record<string, EvStationMapFeature[]>;
	beforeLayer?: string;
	tooltipManager: TooltipManager;
}

function clusterTooltip(evt: MapLayerEventType["mousemove"] & object): Popup | void {
	const feature = evt.features?.[0] as unknown as EvStationClusterMapFeature | undefined;
	if (!feature) return;
	return mountPopup(EvStationClusterTooltip, { feature }, evt.lngLat);
}

export class EvStationsClusterRenderer {
	private _levels: EvStationLevel[] = [];

	constructor(private ctx: EvStationsClusterContext) {}

	apply(stationClickHandler: ClickHandler): void {
		if (!mapManager.map) return;

		for (const level of Object.keys(EV_STATION_LEVELS) as EvStationLevel[]) {
			const sourceId = `${this.ctx.referenceId}-${level}`;
			const features = this.ctx.featuresByLevel[level] ?? [];
			const { bg } = EV_STATION_LEVELS[level];
			const clusterBg = bg.replace("rgb(", "rgba(").replace(")", ", 0.6)");

			mapManager.map.addSource(sourceId, {
				type: "geojson",
				promoteId: "id",
				data: { type: "FeatureCollection", features },
				cluster: true,
				clusterRadius: 40,
				clusterMaxZoom: 9
			});

			mapManager.map.addLayer(
				{
					id: `${sourceId}-cluster-circle`,
					type: "circle",
					source: sourceId,
					filter: ["has", "point_count"],
					paint: {
						"circle-color": clusterBg,
						"circle-radius": ["step", ["get", "point_count"], 15, 10, 20, 25, 25]
					}
				},
				this.ctx.beforeLayer
			);

			mapManager.map.addLayer(
				{
					id: `${sourceId}-cluster-label`,
					type: "symbol",
					source: sourceId,
					filter: ["has", "point_count"],
					layout: {
						"text-field": ["get", "point_count_abbreviated"],
						"text-size": 12,
						"text-allow-overlap": true,
						"text-ignore-placement": true
					},
					paint: { "text-color": "#ffffff" }
				},
				this.ctx.beforeLayer
			);

			mapManager.map.addLayer(
				{
					id: `${sourceId}-unclustered`,
					type: "symbol",
					source: sourceId,
					filter: ["!", ["has", "point_count"]],
					layout: {
						"icon-image": `ev-station-${level}`,
						"icon-allow-overlap": true,
						"icon-ignore-placement": true,
						"icon-size": 1
					},
					paint: {}
				},
				this.ctx.beforeLayer
			);

			const circleLayerId = `${sourceId}-cluster-circle`;
			const unclusteredLayerId = `${sourceId}-unclustered`;

			if (!this.ctx.tooltipManager.has(circleLayerId)) {
				this.ctx.tooltipManager.register(circleLayerId, clusterTooltip);
			}

			clickManager.register([circleLayerId], this.makeClusterClickHandler(sourceId));
			clickManager.register([unclusteredLayerId], stationClickHandler);

			this._levels.push(level);
		}
	}

	remove(): void {
		if (!mapManager.map) return;

		for (const level of this._levels) {
			const sourceId = `${this.ctx.referenceId}-${level}`;
			const layerIds = [
				`${sourceId}-cluster-circle`,
				`${sourceId}-cluster-label`,
				`${sourceId}-unclustered`
			];

			for (const layerId of layerIds) {
				clickManager.unregister([layerId]);
				if (mapManager.map.getLayer(layerId)) {
					mapManager.map.removeLayer(layerId);
				}
			}

			if (mapManager.map.getSource(sourceId)) {
				mapManager.map.removeSource(sourceId);
			}
		}

		this._levels = [];
	}

	get unclusteredLayerIds(): string[] {
		return this._levels.map((level) => `${this.ctx.referenceId}-${level}-unclustered`);
	}

	syncFeatures(): void {
		if (!mapManager.map) return;
		for (const level of this._levels) {
			const sourceId = `${this.ctx.referenceId}-${level}`;
			mapManager.setDataSource(sourceId, this.ctx.featuresByLevel[level] ?? []);
		}
	}

	private makeClusterClickHandler(sourceId: string): ClickHandler {
		return async (features) => {
			try {
				const feature = features[0];
				if (!feature?.properties?.cluster_id) return;
				const source = mapManager.map?.getSource(sourceId) as GeoJSONSource | undefined;
				if (!source) return;
				const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id);
				const coords = (feature.geometry as Point).coordinates as [number, number];
				mapManager.map?.easeTo({ center: coords, zoom });
			} catch (err) {
				console.error("EvStations: cluster expansion zoom failed", err);
			}
		};
	}
}
```

Note: `EvStationClusterTooltip` doesn't exist yet — you'll create it in Task 6. The import will cause a type-check error until then; that's expected.

- [ ] **Commit** (after Task 6 resolves the import)

Skip committing until Task 6 is complete. Continue to Task 5.

---

## Task 5: Rewrite `ev-stations-map-integration.svelte.ts`

**Files:**

- Rewrite: `src/lib/ev-stations/ev-stations-map-integration.svelte.ts`

Extends `MapGeoJSONIntegration`. Manages click popup lifecycle (`currentPopup`), fetches level data lazily when enabled + level toggled, and delegates cluster rendering to `EvStationsClusterRenderer`.

The unclustered `mapLayer` uses `["get", "icon"]` so the same source serves both levels. A `filters` derived property drives level visibility in unclustered mode.

- [ ] **Rewrite `src/lib/ev-stations/ev-stations-map-integration.svelte.ts`**

```ts
import type {
	ExpressionSpecification,
	FilterSpecification,
	Map as MaptilerMap,
	Popup
} from "@maptiler/sdk";
import type { Geometry } from "geojson";
import { untrack } from "svelte";
import { mapManager } from "$lib/map/map.svelte.ts";
import { clickManager, type ClickHandler } from "$lib/map/integrations/click-manager.ts";
import { MapGeoJSONIntegration } from "$lib/map/integrations/map-geojson-integration.svelte.ts";
import { MapDisplayOption } from "$lib/map/integrations/map-display-option.svelte.ts";
import { TooltipManager } from "$lib/map/integrations/tooltip.svelte.ts";
import { mountClickPopup } from "$lib/map/utils.ts";
import { evStationsManager } from "./ev-stations.svelte.ts";
import { EvStationIconManager } from "./ev-station-icons.ts";
import {
	EvStationsClusterRenderer,
	type EvStationsClusterContext
} from "./ev-stations-cluster-renderer.ts";
import type { EvStation, EvStationMapFeature, EvStationMarkerProperties } from "./types.ts";
import EvStationTooltip from "./components/EvStationTooltip.svelte";

class EvStationsMapIntegration
	extends MapGeoJSONIntegration<EvStationMarkerProperties>
	implements EvStationsClusterContext
{
	referenceId: string = "ev-stations";
	enabled: boolean = $state(false);
	clustered: boolean = $state(true);

	icons: EvStationIconManager = new EvStationIconManager();
	tooltipManager: TooltipManager = new TooltipManager();
	private renderer: EvStationsClusterRenderer = new EvStationsClusterRenderer(this);
	private currentPopup: Popup | null = null;

	displayOptions = {
		lvl2: new MapDisplayOption("Level 2", true),
		lvl3: new MapDisplayOption("Level 3", true)
	};

	features: Array<EvStationMapFeature> = $derived.by(() => {
		const result: EvStationMapFeature[] = [];
		if (evStationsManager.lvl2Stations) {
			for (const station of evStationsManager.lvl2Stations) {
				result.push(toFeature(station, "lvl2"));
			}
		}
		if (evStationsManager.lvl3Stations) {
			for (const station of evStationsManager.lvl3Stations) {
				result.push(toFeature(station, "lvl3"));
			}
		}
		return result;
	});

	featuresByLevel: Record<string, EvStationMapFeature[]> = $derived.by(() => {
		const byLevel: Record<string, EvStationMapFeature[]> = {};
		for (const feature of this.features) {
			const level = feature.properties.level;
			if (level === "lvl2" && !this.displayOptions.lvl2.value) continue;
			if (level === "lvl3" && !this.displayOptions.lvl3.value) continue;
			const arr = byLevel[level] ?? [];
			arr.push(feature);
			byLevel[level] = arr;
		}
		return byLevel;
	});

	filters: FilterSpecification = $derived.by((): FilterSpecification => {
		const levels: string[] = [];
		if (this.displayOptions.lvl2.value) levels.push("lvl2");
		if (this.displayOptions.lvl3.value) levels.push("lvl3");
		if (levels.length === 0) return ["==", ["get", "level"], "none"] as ExpressionSpecification;
		if (levels.length === 2) return ["boolean", true] as ExpressionSpecification;
		return ["==", ["get", "level"], levels[0]] as ExpressionSpecification;
	});

	private handleStationClick: ClickHandler = (features, evt) => {
		this.currentPopup?.remove();
		const feature = features[0] as unknown as EvStationMapFeature | undefined;
		if (!feature) return;
		this.currentPopup = mountClickPopup(EvStationTooltip, { feature }, evt.lngLat);
		this.currentPopup.addTo(mapManager.map!);
	};

	get mapLayer(): Parameters<MaptilerMap["addLayer"]>[0] {
		return {
			id: this.referenceId,
			type: "symbol",
			source: this.referenceId,
			filter: this.filters,
			layout: {
				"icon-allow-overlap": true,
				"icon-ignore-placement": true,
				"icon-image": ["get", "icon"],
				"icon-size": 1
			},
			paint: {}
		};
	}

	get mapSource(): Parameters<MaptilerMap["addSource"]>[1] {
		return {
			type: "geojson",
			promoteId: "id",
			data: {
				type: "FeatureCollection",
				features: this.features
			}
		};
	}

	constructor() {
		super();

		$effect.root(() => {
			// Lazy-fetch level data when integration is enabled and level is toggled on
			$effect(() => {
				if (
					this.enabled &&
					this.displayOptions.lvl2.value &&
					evStationsManager.lvl2Stations === undefined
				) {
					evStationsManager.fetchLvl2Stations();
				}
			});

			$effect(() => {
				if (
					this.enabled &&
					this.displayOptions.lvl3.value &&
					evStationsManager.lvl3Stations === undefined
				) {
					evStationsManager.fetchLvl3Stations();
				}
			});

			// Push filter changes to the unclustered layer
			$effect(() => {
				const filter = this.filters;
				if (!mapManager.map || this.clustered) return;
				if (mapManager.map.getLayer(this.referenceId)) {
					mapManager.map.setFilter(this.referenceId, filter);
				}
			});

			// Sync unclustered source when features change
			$effect(() => {
				const features = this.features;
				if (!mapManager.map || this.clustered) return;
				mapManager.setDataSource(this.referenceId, features);
			});

			// Sync clustered sources when featuresByLevel changes
			$effect(() => {
				void this.featuresByLevel;
				if (!mapManager.map || !this.clustered) return;
				this.renderer.syncFeatures();
			});

			// Re-apply when clustered mode switches or data first arrives
			$effect(() => {
				void this.clustered;
				const hasFeatures = Object.keys(this.featuresByLevel).length > 0;
				if (!untrack(() => mapManager.map) || !hasFeatures || !untrack(() => this.enabled)) return;
				untrack(() => this.apply());
			});
		});
	}

	apply() {
		if (!mapManager.map) return;

		if (this.clustered) {
			if (mapManager.map.getLayer(this.referenceId)) mapManager.map.removeLayer(this.referenceId);
			if (mapManager.map.getSource(this.referenceId)) mapManager.map.removeSource(this.referenceId);
			clickManager.unregister([this.referenceId]);
			this.tooltipManager.disable();
			this.renderer.remove();
			this.icons.loadIcons().then(() => {
				this.renderer.apply(this.handleStationClick);
				this.tooltipManager.enable();
			});
		} else {
			this.renderer.remove();
			this.tooltipManager.disable();
			clickManager.unregister([this.referenceId]);
			super.apply();
			this.icons.loadIcons().then(() => {
				clickManager.register([this.referenceId], this.handleStationClick);
				this.tooltipManager.enable();
			});
		}
	}

	remove() {
		clickManager.unregister([this.referenceId]);
		clickManager.unregister(this.renderer.unclusteredLayerIds);
		this.renderer.remove();
		this.currentPopup?.remove();
		this.currentPopup = null;
		super.remove();
	}
}

function toFeature(station: EvStation, level: "lvl2" | "lvl3"): EvStationMapFeature {
	return {
		type: "Feature",
		properties: {
			icon: `ev-station-${level}`,
			id: station.id,
			level,
			station_name: station.station_name ?? "",
			facility_type: station.facility_type ?? "",
			ev_network: station.ev_network ?? "",
			station_phone: station.station_phone ?? "",
			street_address: station.street_address ?? "",
			city: station.city ?? "",
			state: station.state ?? "",
			zip: station.zip ?? "",
			access_days_time: station.access_days_time ?? "",
			access_detail_code: station.access_detail_code ?? "",
			cards_accepted: station.cards_accepted ?? null,
			ev_pricing: station.ev_pricing ?? "",
			ev_connector_types: JSON.stringify(station.ev_connector_types ?? [])
		},
		geometry: {
			type: "Point",
			coordinates: [station.longitude, station.latitude]
		} as Geometry
	};
}

export const evStationsMapIntegration = new EvStationsMapIntegration();
export type { EvStationsMapIntegration };
```

Note: `EvStationTooltip` doesn't exist yet — type-check errors are expected until Task 6. Continue to Task 6.

---

## Task 6: Create `EvStationTooltip.svelte`

**Files:**

- Create: `src/lib/ev-stations/components/EvStationTooltip.svelte`

Rendered inside a MapTiler `Popup` (mounted via `mountClickPopup`). Feature properties are static once the popup opens, so plain variables (not runes) are used for derived data. `ev_connector_types` is parsed from JSON. Material Symbols icons are replaced with Lucide's `CreditCard` and `Zap`.

- [ ] **Create `src/lib/ev-stations/components/EvStationTooltip.svelte`**

```svelte
<script lang="ts">
	import CreditCard from "@lucide/svelte/icons/credit-card";
	import Zap from "@lucide/svelte/icons/zap";
	import type { EvStationMapFeature } from "../types";

	interface Props {
		feature: EvStationMapFeature;
	}

	const { feature }: Props = $props();
	const p = feature.properties;

	const connectors: string[] = JSON.parse(p.ev_connector_types || "[]");

	const cards: string[] = p.cards_accepted ? p.cards_accepted.split(",").map((c) => c.trim()) : [];

	const hours: string[] = (() => {
		if (!p.access_days_time) return [];
		const delimiter = p.access_days_time.includes("|") ? "|" : ";";
		return p.access_days_time.split(delimiter).map((line) => {
			const trimmed = line.trim();
			return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
		});
	})();

	const pricingLines: string[] = (() => {
		if (!p.ev_pricing) return [];
		return p.ev_pricing.split(";").flatMap((segment) =>
			segment
				.split("and")
				.map((part) => part.trim())
				.filter(Boolean)
		);
	})();

	const mapsUrl: string = (() => {
		if (!p.street_address || !p.city || !p.state || !p.zip) return "";
		return `https://maps.google.com/?q=${p.street_address}+${p.city},+${p.state}+${p.zip}`;
	})();
</script>

<div class="flex max-w-xs flex-col gap-2 p-1">
	<p class="text-center text-lg font-bold">{p.station_name}</p>

	{#if p.facility_type || p.ev_network}
		<div class="flex flex-wrap justify-center gap-2">
			{#if p.facility_type}
				<span class="rounded bg-blue-500 px-2 py-0.5 text-xs text-white">{p.facility_type}</span>
			{/if}
			{#if p.ev_network}
				<span class="rounded bg-blue-500 px-2 py-0.5 text-xs text-white">{p.ev_network}</span>
			{/if}
		</div>
	{/if}

	<div class="flex gap-4">
		<div class="flex flex-col gap-1">
			{#if p.station_phone}
				<a href="tel:+1{p.station_phone}" class="text-sm underline">{p.station_phone}</a>
			{/if}
			{#if mapsUrl}
				<a href={mapsUrl} target="_blank" class="text-sm leading-tight underline">
					{p.street_address}<br />{p.city}, {p.state}
					{p.zip}
				</a>
			{/if}
		</div>
		{#if hours.length}
			<div class="flex flex-col text-sm">
				{#each hours as line}
					<p>{line}</p>
				{/each}
			</div>
		{/if}
	</div>

	{#if p.access_detail_code}
		<span class="w-fit rounded bg-red-500 px-2 py-0.5 text-xs text-white">
			{p.access_detail_code}
		</span>
	{/if}

	{#if cards.length}
		<div class="flex flex-wrap gap-1">
			{#each cards as card}
				<span class="flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs">
					<CreditCard class="size-3.5" />
					{card}
				</span>
			{/each}
		</div>
	{/if}

	{#if connectors.length}
		<div class="flex flex-wrap gap-1">
			{#each connectors as connector}
				<span
					class="flex items-center gap-1 rounded bg-green-600 px-1.5 py-0.5 text-xs font-semibold text-white"
				>
					<Zap class="size-3.5" />
					{connector}
				</span>
			{/each}
		</div>
	{/if}

	{#if pricingLines.length}
		<div class="text-sm">
			{#each pricingLines as line}
				<p>{line}</p>
			{/each}
		</div>
	{/if}
</div>
```

- [ ] **Type-check**

```bash
npm run check
```

Expected: no errors from the three new files (Tasks 4–6). The `EvStationClusterTooltip` import in the renderer still has an error — resolved in Task 7.

---

## Task 7: Create `EvStationClusterTooltip.svelte`

**Files:**

- Create: `src/lib/ev-stations/components/EvStationClusterTooltip.svelte`

Appears on cluster hover (via `TooltipManager`/mousemove). Level is derived from `feature.source` since cluster properties don't carry individual feature properties. Count comes from `point_count` on the cluster.

- [ ] **Create `src/lib/ev-stations/components/EvStationClusterTooltip.svelte`**

```svelte
<script lang="ts">
	import type { EvStationClusterMapFeature } from "../types";

	interface Props {
		feature: EvStationClusterMapFeature;
	}

	const { feature }: Props = $props();

	const levelLabel = feature.source.includes("lvl2") ? "Level 2" : "Level 3";
</script>

<div class="flex flex-col gap-1 p-1">
	<p class="font-semibold">{levelLabel} Chargers</p>
	<p class="text-sm">{feature.properties.point_count} stations</p>
</div>
```

- [ ] **Type-check**

```bash
npm run check
```

Expected: no errors across Tasks 1–7.

- [ ] **Commit Tasks 4–7 together**

```bash
git add \
  src/lib/ev-stations/ev-stations-cluster-renderer.ts \
  src/lib/ev-stations/ev-stations-map-integration.svelte.ts \
  src/lib/ev-stations/components/EvStationTooltip.svelte \
  src/lib/ev-stations/components/EvStationClusterTooltip.svelte
git commit -m "feat(ev-stations): add cluster renderer, integration, and tooltip components"
```

---

## Task 8: Create `EvStationsDisplayOptions.svelte`

**Files:**

- Create: `src/lib/ev-stations/components/EvStationsDisplayOptions.svelte`

Follows the same pattern as `MonitorsDisplayOptions.svelte`. Fetch side-effects live in the integration's `$effect`, not here — this component only binds to display option values.

- [ ] **Create `src/lib/ev-stations/components/EvStationsDisplayOptions.svelte`**

```svelte
<script lang="ts">
	import DisplayOption from "$lib/components/DisplayOption.svelte";
	import ToggleSwitch from "$lib/components/ToggleSwitch.svelte";
	import { evStationsMapIntegration } from "../ev-stations-map-integration.svelte";
</script>

<DisplayOption>
	<p class="whitespace-nowrap text-lg font-bold underline">EV Stations</p>
	<div class="mb-2 w-full text-xs">
		<div class="w-fit">
			<ToggleSwitch
				id="ev-clusters"
				label="Marker Clusters"
				bind:value={evStationsMapIntegration.clustered}
			/>
		</div>
	</div>
	<label for="ev-lvl2" class="cursor-pointer select-none whitespace-nowrap">
		<input
			type="checkbox"
			id="ev-lvl2"
			bind:checked={evStationsMapIntegration.displayOptions.lvl2.value}
		/>
		Level 2
	</label>
	<label for="ev-lvl3" class="cursor-pointer select-none whitespace-nowrap">
		<input
			type="checkbox"
			id="ev-lvl3"
			bind:checked={evStationsMapIntegration.displayOptions.lvl3.value}
		/>
		Level 3
	</label>
</DisplayOption>
```

- [ ] **Type-check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Commit**

```bash
git add src/lib/ev-stations/components/EvStationsDisplayOptions.svelte
git commit -m "feat(ev-stations): add display options component"
```

---

## Task 9: Wire into `App.svelte` and delete `mod.ts`

**Files:**

- Modify: `src/App.svelte`
- Delete: `src/lib/ev-stations/mod.ts`

Add `evStationsMapIntegration` to the integrations array so the `MapLayerIntegration` lifecycle effect activates it. Add `<EvStationsDisplayOptions />` to the menu. Delete the old Leaflet-based `mod.ts`.

- [ ] **Add imports to `src/App.svelte`**

After the existing `import { collocationSitesMapIntegration }` line, add:

```ts
import EvStationsDisplayOptions from "$lib/ev-stations/components/EvStationsDisplayOptions.svelte";
import { evStationsMapIntegration } from "$lib/ev-stations/ev-stations-map-integration.svelte.ts";
```

- [ ] **Add to the `integrations` array in `src/App.svelte`**

Change:

```ts
const integrations: Array<SomeMapIntegration> = [
	baseLayerSeperator,
	collocationSitesMapIntegration,
	windMapIntegration,
	monitorsMapIntegration
];
```

To:

```ts
const integrations: Array<SomeMapIntegration> = [
	baseLayerSeperator,
	collocationSitesMapIntegration,
	windMapIntegration,
	monitorsMapIntegration,
	evStationsMapIntegration
];
```

- [ ] **Add `<EvStationsDisplayOptions />` to the menu in `src/App.svelte`**

Change:

```svelte
<Menu>
	<MonitorsDisplayOptions />
	<MapLayersDisplayOptions />
	<MapStyleDisplayOptions />
</Menu>
```

To:

```svelte
<Menu>
	<MonitorsDisplayOptions />
	<EvStationsDisplayOptions />
	<MapLayersDisplayOptions />
	<MapStyleDisplayOptions />
</Menu>
```

- [ ] **Delete `mod.ts`**

```bash
rm src/lib/ev-stations/mod.ts
```

- [ ] **Type-check and lint**

```bash
npm run check && npm run lint
```

Expected: no errors or warnings from EV station files.

- [ ] **Commit**

```bash
git add src/App.svelte
git rm src/lib/ev-stations/mod.ts
git commit -m "feat(ev-stations): wire integration into app, remove legacy mod.ts"
```

---

## Self-Review Checklist

- [x] `mountClickPopup` added to `utils.ts` (Task 1)
- [x] All three new types in `types.ts` (Task 2)
- [x] `EvStationIconManager` registers `ev-station-lvl2` and `ev-station-lvl3` (Task 3)
- [x] Cluster renderer: circle + label + unclustered layers per level, click-zoom, hover tooltip (Task 4)
- [x] Integration: lazy fetch, `featuresByLevel`, `filters`, unclustered filter push, click popup, `remove()` cleans up popup (Task 5)
- [x] `EvStationTooltip`: all mod.ts fields rendered, Lucide icons, Tailwind classes (Task 6)
- [x] `EvStationClusterTooltip`: level from `feature.source`, count from `point_count` (Task 7)
- [x] `EvStationsDisplayOptions`: clusters toggle + level 2/3 checkboxes (Task 8)
- [x] App wired: integration in array, component in menu, `mod.ts` deleted (Task 9)
