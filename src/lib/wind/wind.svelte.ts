import { Map as MaptilerMap } from "@maptiler/sdk";
import { WindLayer } from "@maptiler/weather";
import { BaseLayerSeperator } from "../map/integrations/base-layer-seperator.ts";
import { MapLayerIntegration } from "$lib/map/integrations/map-layer-integration.svelte.ts";

export class WindMapIntegration extends MapLayerIntegration {
  referenceId: string = "MapTiler Wind";

  beforeLayer = new BaseLayerSeperator().referenceId;

  enabled: boolean = false;

  mapLayer: Parameters<MaptilerMap["addLayer"]>[0] = new WindLayer({
    id: this.referenceId,
    opacity: 0.5,
  });
}
