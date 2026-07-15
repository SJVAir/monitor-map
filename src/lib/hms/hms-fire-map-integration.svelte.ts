import type { Map as MaptilerMap } from "@maptiler/sdk";
import type { Feature } from "geojson";
import type { Point } from "geojson";
import { mapManager } from "$lib/map/map.svelte";
import { MapIconLayerIntegration } from "$lib/map/integrations/map-geojson-integration.svelte";
import { hmsManager } from "./hms.svelte";
import { HMSFireIconManager, getTierIconId } from "./hms-fire-icon-manager";

type FireProperties = Record<string, unknown>;

const ZOOM_THRESHOLD = 10;

class HMSFireMapIntegration extends MapIconLayerIntegration<FireProperties> {
	referenceId = "hms-fire";
	enabled: boolean = $state(true);
	icons = new HMSFireIconManager();
	private zoomedIn: boolean = $state(false);

	get features(): Array<Feature<Point, FireProperties>> {
		return this.zoomedIn ? this.hotspotFeatures : this.groupFeatures;
	}

	get mapLayer(): Parameters<MaptilerMap["addLayer"]>[0] {
		return {
			id: this.referenceId,
			type: "symbol",
			source: this.referenceId,
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

	private get groupFeatures(): Array<Feature<Point, FireProperties>> {
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

	private get hotspotFeatures(): Array<Feature<Point, FireProperties>> {
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

	private onZoom = () => {
		if (!mapManager.map) return;
		this.zoomedIn = mapManager.map.getZoom() >= ZOOM_THRESHOLD;
	};

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
		this.icons
			.loadIcons()
			.then(() => {
				if (!mapManager.map || !this.enabled) return;
				this.remove();
				this.zoomedIn = mapManager.map.getZoom() >= ZOOM_THRESHOLD;
				mapManager.map.addSource(this.referenceId, this.mapSource);
				mapManager.map.addLayer(this.mapLayer, this.beforeLayer);
				mapManager.map.on("zoom", this.onZoom);
			})
			.catch(console.error);
	}

	remove() {
		mapManager.map?.off("zoom", this.onZoom);
		super.remove();
	}
}

export const hmsFireMapIntegration = new HMSFireMapIntegration();
export type { HMSFireMapIntegration };
