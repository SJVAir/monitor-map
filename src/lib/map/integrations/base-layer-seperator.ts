import { Map as MaptilerMap } from "@maptiler/sdk";
import { MapLayerIntegration } from "./map-layer-integration.svelte.ts";

class BaseLayerSeperator extends MapLayerIntegration {
	referenceId: string = "Base Layer Seperator";

	enabled: boolean = true;

	mapLayer: Parameters<MaptilerMap["addLayer"]>[0] = {
		id: this.referenceId,
		type: "custom",
		render: function () {}
	};
}

export const baseLayerSeperator = new BaseLayerSeperator();
export type { BaseLayerSeperator };
