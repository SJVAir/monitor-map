import type { Map as MaptilerMap } from "@maptiler/sdk";
import type { Feature, Geometry } from "geojson";
import type { MapIconManager } from "./map-icon-manager.ts";
import { MapLayerIntegration } from "./map-layer-integration.svelte.ts";

export abstract class MapGeoJSONIntegration<T extends Record<string, any>> extends MapLayerIntegration {
  abstract icons: MapIconManager;
  abstract features: Array<Feature<Geometry, T>>;
  abstract mapSource: Parameters<MaptilerMap["addSource"]>[1];

  apply() {
    if (!MapGeoJSONIntegration.mapCtrl.map) return;

    this.icons.loadIcons()
      .then(() => {
        this.remove();
        MapGeoJSONIntegration.mapCtrl.map?.addSource(this.referenceId, this.mapSource);
        super.apply();
      });

  }

  remove() {
    super.remove();
    if (MapGeoJSONIntegration.mapCtrl.map?.getSource(this.referenceId)) {
      MapGeoJSONIntegration.mapCtrl.map.removeSource(this.referenceId);
    }
  }
}
