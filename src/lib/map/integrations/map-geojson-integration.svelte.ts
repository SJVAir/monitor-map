import type { Map as MaptilerMap } from "@maptiler/sdk";
import type { Feature, Geometry } from "geojson";
import type { MapIconManager } from "./map-icon-manager.ts";
import { MapLayerIntegration } from "./map-layer-integration.svelte.ts";
import { mapManager } from "../map.svelte.ts";

export abstract class MapGeoJSONIntegration<
	T = Record<string, unknown>
> extends MapLayerIntegration {
	abstract features: Array<Feature<Geometry, T>>;
	abstract mapSource: Parameters<MaptilerMap["addSource"]>[1];

	remove() {
		super.remove();
		if (mapManager.map?.getSource(this.referenceId)) {
			mapManager.map.removeSource(this.referenceId);
		}
	}
}

export abstract class MapIconLayerIntegration<
	T = Record<string, unknown>
> extends MapGeoJSONIntegration<T> {
	abstract icons: MapIconManager;

	apply() {
		if (!mapManager.map) return;

		this.icons.loadIcons().then(() => {
			this.remove();
			mapManager.map?.addSource(this.referenceId, this.mapSource);
			super.apply();
		});
	}
}
