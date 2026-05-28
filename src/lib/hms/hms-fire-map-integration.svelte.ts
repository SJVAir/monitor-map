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
const HOTSPOT_LAYER_ID = "hms-fire-hotspots-layer";

class HMSFireMapIntegration extends MapIconLayerIntegration<FireGroupProperties> {
	referenceId = "hms-fire-groups";
	enabled: boolean = $state(true);
	icons = new HMSFireIconManager();

	get features(): Array<Feature<Point, FireGroupProperties>> {
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
			data: { type: "FeatureCollection", features: this.features }
		};
	}

	private get hotspotFeatures(): Array<Feature<Point, FireHotspotProperties>> {
		return (hmsManager.fire ?? []).map((d) => ({
			type: "Feature",
			properties: {
				id: d.id,
				icon: getTierIconId(d.frp),
				frp: d.frp
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
			id: HOTSPOT_LAYER_ID,
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
				const features = this.features;
				if (!mapManager.map || !this.enabled) return;
				mapManager.setDataSource(this.referenceId, features);
			});

			$effect(() => {
				const features = this.hotspotFeatures;
				if (!mapManager.map || !this.enabled) return;
				mapManager.setDataSource(HOTSPOT_SOURCE_ID, features);
			});
		});
	}

	apply() {
		if (!mapManager.map) return;
		this.icons.loadIcons().then(() => {
			if (!mapManager.map || !this.enabled) return;
			this.remove();
			mapManager.map.addSource(this.referenceId, this.mapSource);
			mapManager.map.addLayer(this.mapLayer, this.beforeLayer);
			mapManager.map.addSource(HOTSPOT_SOURCE_ID, this.hotspotSource);
			mapManager.map.addLayer(this.hotspotLayer, this.beforeLayer);
		});
	}

	remove() {
		if (mapManager.map?.getLayer(HOTSPOT_LAYER_ID)) {
			mapManager.map.removeLayer(HOTSPOT_LAYER_ID);
		}
		if (mapManager.map?.getSource(HOTSPOT_SOURCE_ID)) {
			mapManager.map.removeSource(HOTSPOT_SOURCE_ID);
		}
		super.remove();
	}
}

export const hmsFireMapIntegration = new HMSFireMapIntegration();
export type { HMSFireMapIntegration };
