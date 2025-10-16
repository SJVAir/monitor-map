import { Map as MaptilerMap } from "@maptiler/sdk";
import { Singleton } from "@tstk/decorators";
import { MapIntegration } from "./integrations.ts";

@Singleton
export class BaseLayerSeperator extends MapIntegration {
  referenceId: string = "Base Layer Seperator"

  enabled: boolean = true;

  mapLayer: Parameters<MaptilerMap["addLayer"]>[0] = {
    id: this.referenceId,
    type: "custom",
    render: function () { },
  };
}
