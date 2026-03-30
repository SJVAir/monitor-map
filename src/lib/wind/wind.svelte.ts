import { Map as MaptilerMap } from "@maptiler/sdk";
import { WindLayer } from "@maptiler/weather";
import { BaseLayerSeperator } from "../map/integrations/base-layer-seperator.ts";
import { MapLayerIntegration } from "$lib/map/integrations/map-layer-integration.svelte.ts";

class WindMapIntegration extends MapLayerIntegration {
	referenceId: string = "MapTiler Wind";

	beforeLayer = new BaseLayerSeperator().referenceId;

	enabled: boolean = $state(false);

	mapLayer = new WindLayer({
		id: this.referenceId,
		opacity: 0.5
	}) as unknown as Parameters<MaptilerMap["addLayer"]>[0];
}

export const windMapIntegration = new WindMapIntegration();
export type { WindMapIntegration };
