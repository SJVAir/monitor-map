import type { Map as MaptilerMap } from "@maptiler/sdk";
import type { Feature, MultiPolygon } from "geojson";
import type { HMSSmokeGeoJSON } from "@sjvair/sdk/hms";
import { mapManager } from "$lib/map/map.svelte";
import { MapGeoJSONIntegration } from "$lib/map/integrations/map-geojson-integration.svelte";
import { hmsManager } from "./hms.svelte";

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
				],
				"fill-outline-color": ["match", ["get", "density"],
					"light", "#bfc8c3",
					"medium", "#757b78",
					"#333634"
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
