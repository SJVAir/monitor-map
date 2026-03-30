import type { Map as MaptilerMap } from "@maptiler/sdk";
import { mapManager } from "../map.svelte.ts";
import { MapIntegration } from "./map-integration.svelte.ts";

export abstract class MapLayerIntegration extends MapIntegration {
	abstract referenceId: string;
	abstract mapLayer: Parameters<MaptilerMap["addLayer"]>[0];
	abstract enabled: boolean;
	beforeLayer?: string;

	apply() {
		if (!mapManager.map) return;
		mapManager.map.addLayer(this.mapLayer, this.beforeLayer);

		const isVisible = mapManager.map.getLayoutProperty(this.referenceId, "visibility");

		if (this.enabled) {
			if (!isVisible || isVisible !== "visible") {
				mapManager.map.setLayoutProperty(this.referenceId, "visibility", "visible");
			}
		} else {
			if (!isVisible || isVisible === "visible") {
				mapManager.map.setLayoutProperty(this.referenceId, "visibility", "none");
			}
		}
	}

	remove() {
		if (mapManager.map?.getLayer(this.referenceId)) {
			mapManager.map.removeLayer(this.referenceId);
		}
	}
}
