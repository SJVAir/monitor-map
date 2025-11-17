import { Map as MaptilerMap } from "@maptiler/sdk";
import { WindLayer } from "@maptiler/weather";
import { Singleton } from "@tstk/decorators";
import { Reactive } from "$lib/reactivity.svelte.ts";
import { BaseLayerSeperator } from "../map/integrations/base-layer-seperator.ts";
import { MapLayerIntegration } from "$lib/map/integrations/map-layer-integration.svelte.ts";

@Singleton
export class WindMapIntegration extends MapLayerIntegration {
  referenceId: string = "MapTiler Wind";

  beforeLayer = new BaseLayerSeperator().referenceId;

  enabled: boolean = false;

  mapLayer: Parameters<MaptilerMap["addLayer"]>[0] = new WindLayer({
    id: this.referenceId,
    opacity: 0.5,
  });
}
