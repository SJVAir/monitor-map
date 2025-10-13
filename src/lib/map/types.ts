import type { FilterSpecification, MapLayerEventType, Map as MaptilerMap, Popup } from "@maptiler/sdk";
import type { Feature, Geometry } from "geojson";

interface TooltipController {
  tooltipPopup: Popup | null;
  map: MaptilerMap;
}
export type TooltipPopup = <T extends TooltipController>(mapCtrl: T) => (evt: MapLayerEventType["mousemove"] & Object) => void;

//export interface MapIntegration {
//  referenceId: string;
//  beforeLayer?: string;
//  mapLayer: Parameters<MaptilerMap["addLayer"]>[0];
//}
//
//export interface MapGeoJSONIntegration<T extends Record<string, any>> extends MapIntegration {
//  icons: Record<string, HTMLImageElement>;
//  features: Array<Feature<Geometry, T>>;
//  mapSource: Parameters<MaptilerMap["addSource"]>[1];
//  filters?: FilterSpecification;
//  tooltip?: TooltipPopup;
//}
