import type { Map as MaptilerMap } from "@maptiler/sdk";
import type { Feature, MultiPolygon } from "geojson";
import type { HMSSmokeGeoJSON } from "@sjvair/sdk/hms";
import { mapManager } from "$lib/map/map.svelte";
import { MapGeoJSONIntegration } from "$lib/map/integrations/map-geojson-integration.svelte";
import { hmsManager } from "./hms.svelte";
import type { SmokeDensityStyle } from "$lib/legend/legend-data";

/** Smoke fill styles, shared by the map layer and the legend so they can't drift apart. */
export const SMOKE_DENSITY_STYLES = {
	light: { label: "Light", color: "#bfc8c3", opacity: 0.2 },
	medium: { label: "Medium", color: "#757b78", opacity: 0.3 },
	heavy: { label: "Heavy", color: "#333634", opacity: 0.4 }
} satisfies Record<string, SmokeDensityStyle>;

export const SMOKE_LEGEND: Array<SmokeDensityStyle> = Object.values(SMOKE_DENSITY_STYLES);

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
				"fill-color": [
					"match",
					["get", "density"],
					"light",
					SMOKE_DENSITY_STYLES.light.color,
					"medium",
					SMOKE_DENSITY_STYLES.medium.color,
					SMOKE_DENSITY_STYLES.heavy.color
				],
				"fill-opacity": [
					"match",
					["get", "density"],
					"light",
					SMOKE_DENSITY_STYLES.light.opacity,
					"medium",
					SMOKE_DENSITY_STYLES.medium.opacity,
					SMOKE_DENSITY_STYLES.heavy.opacity
				],
				"fill-outline-color": [
					"match",
					["get", "density"],
					"light",
					SMOKE_DENSITY_STYLES.light.color,
					"medium",
					SMOKE_DENSITY_STYLES.medium.color,
					SMOKE_DENSITY_STYLES.heavy.color
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
