import { Map as MaptilerMap } from "@maptiler/sdk";
import { Singleton } from "@tstk/decorators";
import { MapLayerIntegration } from "./map-layer-integration.svelte.ts";

@Singleton
export class BaseLayerSeperator extends MapLayerIntegration {
  referenceId: string = "Base Layer Seperator"

  enabled: boolean = true;

  mapLayer: Parameters<MaptilerMap["addLayer"]>[0] = {
    id: this.referenceId,
    type: "custom",
    render: function () { },
  };
}
