import { Map as MaptilerMap } from "@maptiler/sdk";
import { WindLayer } from "@maptiler/weather";
import { Singleton } from "@tstk/decorators";
import { Reactive } from "$lib/reactivity.svelte.ts";
import { MapIntegration } from "../map/integrations.ts";
import { BaseLayerSeperator } from "../map/base-layer-seperator.ts";

@Singleton
export class WindMapIntegration extends MapIntegration {
  referenceId: string = "MapTiler Wind";

  beforeLayer = new BaseLayerSeperator().referenceId;

  @Reactive()
  accessor enabled: boolean = false;

  mapLayer: Parameters<MaptilerMap["addLayer"]>[0] = new WindLayer({
    id: this.referenceId,
    opacity: 0.5,
  });
}
