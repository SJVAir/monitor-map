import type { Map as MaptilerMap } from "@maptiler/sdk";
import type { Feature, Geometry } from "geojson";
import type { MapIconManager } from "./map-icon-manager.ts";
import { MapLayerIntegration } from "./map-layer-integration.svelte.ts";
import { mapManager } from "../map.svelte.ts";

export abstract class MapGeoJSONIntegration<
	T extends Record<string, any>
> extends MapLayerIntegration {
	abstract icons: MapIconManager;
	abstract features: Array<Feature<Geometry, T>>;
	abstract mapSource: Parameters<MaptilerMap["addSource"]>[1];

	apply() {
		if (!mapManager.map) return;

		this.icons.loadIcons().then(() => {
			this.remove();
			mapManager.map?.addSource(this.referenceId, this.mapSource);
			super.apply();
		});
	}

	remove() {
		super.remove();
		if (mapManager.map?.getSource(this.referenceId)) {
			mapManager.map.removeSource(this.referenceId);
		}
	}
}
