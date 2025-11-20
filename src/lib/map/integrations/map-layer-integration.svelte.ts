import type { Map as MaptilerMap } from "@maptiler/sdk";
import { state as mapState } from "../map.svelte.ts";
import { MapIntegration } from "./map-integration.svelte.ts";

export abstract class MapLayerIntegration extends MapIntegration {
  abstract referenceId: string;
  abstract mapLayer: Parameters<MaptilerMap["addLayer"]>[0];
  abstract enabled: boolean;
  beforeLayer?: string;

  apply() {
    if (!mapState.map) return;
    mapState.map.addLayer(this.mapLayer, this.beforeLayer);

    const isVisible = mapState.map.getLayoutProperty(this.referenceId, "visibility");

    if (this.enabled) {
      if (!isVisible || isVisible !== "visible") {
        mapState.map.setLayoutProperty(this.referenceId, "visibility", "visible");
      }
    } else {
      if (!isVisible || isVisible === "visible") {
        mapState.map.setLayoutProperty(this.referenceId, "visibility", "none");
      }
    }
  }

  remove() {
    if (mapState.map?.getLayer(this.referenceId)) {
      mapState.map.removeLayer(this.referenceId);
    }
  }
}
