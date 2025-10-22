import type { Map as MaptilerMap } from "@maptiler/sdk";
import { MapController } from "../map.svelte.ts";
import { MapIntegration } from "./map-integration.svelte.ts";

export abstract class MapLayerIntegration extends MapIntegration {
  abstract referenceId: string;
  abstract mapLayer: Parameters<MaptilerMap["addLayer"]>[0];
  abstract enabled: boolean;
  beforeLayer?: string;

  apply() {
    if (!MapLayerIntegration.mapCtrl.map) return;
    MapLayerIntegration.mapCtrl.map.addLayer(this.mapLayer, this.beforeLayer);

    const isVisible = MapLayerIntegration.mapCtrl.map.getLayoutProperty(this.referenceId, "visibility");

    if (this.enabled) {
      if (!isVisible || isVisible !== "visible") {
        MapLayerIntegration.mapCtrl.map.setLayoutProperty(this.referenceId, "visibility", "visible");
      }
    } else {
      if (!isVisible || isVisible === "visible") {
        MapLayerIntegration.mapCtrl.map.setLayoutProperty(this.referenceId, "visibility", "none");
      }
    }
  }

  remove() {
    if (MapLayerIntegration.mapCtrl.map?.getLayer(this.referenceId)) {
      MapLayerIntegration.mapCtrl.map.removeLayer(this.referenceId);
    }
  }
}
