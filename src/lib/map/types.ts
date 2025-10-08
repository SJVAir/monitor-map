import type { FilterSpecification, MapLayerEventType, Map as MaptilerMap, Popup } from "@maptiler/sdk";
import type { Feature, Geometry } from "geojson";

interface TooltipController {
  tooltipPopup: Popup | null;
  map: MaptilerMap;
}
export type TooltipPopup = <T extends TooltipController>(mapCtrl: T) => (evt: MapLayerEventType["mousemove"] & Object) => void;

export interface MapIntegration<T extends Record<string, any>> {
  referenceId: string;
  icons: Record<string, HTMLImageElement>;
  features: Array<Feature<Geometry, T>>;
  mapLayer: Parameters<MaptilerMap["addLayer"]>;
  mapSource: Parameters<MaptilerMap["addSource"]>;
  filters?: FilterSpecification;
  tooltip?: TooltipPopup;

}
