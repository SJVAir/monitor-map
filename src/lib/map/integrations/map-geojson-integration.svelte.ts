import type { FilterSpecification, Map as MaptilerMap } from "@maptiler/sdk";
import type { Feature, Geometry } from "geojson";
import type { MapIconManager } from "./map-icon-manager.ts";
import type { TooltipPopup } from "./types.ts";
import { MapLayerIntegration } from "./map-layer-integration.svelte.ts";

export abstract class MapGeoJSONIntegration<T extends Record<string, any>> extends MapLayerIntegration {
  abstract icons: MapIconManager;
  abstract features: Array<Feature<Geometry, T>>;
  abstract mapSource: Parameters<MaptilerMap["addSource"]>[1];
  abstract filters?: FilterSpecification;
  abstract tooltip?: TooltipPopup;
  cursorPointer?: boolean;

  apply() {
    if (!MapGeoJSONIntegration.mapCtrl.map) return;

    this.icons.loadIcons(MapGeoJSONIntegration.mapCtrl.map)
      .then(() => {
        this.remove();
        MapGeoJSONIntegration.mapCtrl.map?.addSource(this.referenceId, this.mapSource);
        super.apply();
      });

  }

  register() {
    if (!MapGeoJSONIntegration.mapCtrl.map) return;

    if (this.cursorPointer) {
      MapGeoJSONIntegration.mapCtrl.map.on("mousemove", this.referenceId, () => {
        MapGeoJSONIntegration.mapCtrl.map!.getCanvas().style.cursor = "pointer";
      });
      MapGeoJSONIntegration.mapCtrl.map.on("mouseleave", this.referenceId, () => {
        MapGeoJSONIntegration.mapCtrl.map!.getCanvas().style.cursor = "";
      });
    }

    if (this.tooltip) {
      const tooltip = this.tooltip(MapGeoJSONIntegration.mapCtrl);

      MapGeoJSONIntegration.mapCtrl.map.on("mousemove", this.referenceId, tooltip);
      MapGeoJSONIntegration.mapCtrl.map.on("mouseleave", this.referenceId, () => {
        if (MapGeoJSONIntegration.mapCtrl.tooltipPopup) MapGeoJSONIntegration.mapCtrl.tooltipPopup.remove();
        MapGeoJSONIntegration.mapCtrl.tooltipPopup = null;
      });
    }
  }

  remove() {
    super.remove();
    if (MapGeoJSONIntegration.mapCtrl.map?.getSource(this.referenceId)) {
      MapGeoJSONIntegration.mapCtrl.map.removeSource(this.referenceId);
    }
  }
}
