import { Map as MaptilerMap } from "@maptiler/sdk";
import { Singleton } from "@tstk/decorators";
import type { MapIntegration } from "./integrations.ts";

@Singleton
export class BaseLayerSeperator implements MapIntegration {
  referenceId: string = "Base Layer Seperator"

  enabled: boolean = true;

  mapLayer: Parameters<MaptilerMap["addLayer"]>[0] = {
    id: this.referenceId,
    type: "custom",
    render: function () { },
  };
}
