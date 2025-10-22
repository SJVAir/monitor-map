import type { MapLayerEventType, Map as MaptilerMap, Popup } from "@maptiler/sdk";
import type { MapIntegration } from "./map-integration.svelte";
import type { MapGeoJSONIntegration } from "./map-geojson-integration.svelte";
//import type { XMap } from "@tstk/builtin-extensions";
//import type { Feature, Geometry } from "geojson";
//import type { MapController } from "../map.svelte.ts";

export type TooltipPopup = <T extends TooltipController>(mapCtrl: T) => (evt: MapLayerEventType["mousemove"] & Object) => void;
export type SomeMapIntegration = MapIntegration | MapGeoJSONIntegration<any>;

interface TooltipController {
  tooltipPopup: Popup | null;
  map?: MaptilerMap;
}

export interface MapImageIcon {
  id: string;
  image: HTMLImageElement;
}


//export interface MapIconManager {
//  icons: XMap<string, MapImageIcon>;
//
//  get(id: string): MapImageIcon | undefined;
//
//  has(id: string): boolean;
//
//  loadIcons(map: MaptilerMap): void;
//
//  register(id: string, icon: HTMLImageElement): void;
//
//  loadImage(icon: MapImageIcon, map: MaptilerMap): Promise<MaptilerMap>;
//}
//
//
//export interface MapIntegration {
//  referenceId: string;
//  mapLayer: Parameters<MaptilerMap["addLayer"]>[0];
//  enabled: boolean;
//  beforeLayer?: string;
//
//  apply(): void;
//}
//
//export interface MapGeoJSONIntegration<T extends Record<string, any>> extends MapIntegration {
//  icons: MapIconManager;
//  features: Array<Feature<Geometry, T>>;
//  mapSource: Parameters<MaptilerMap["addSource"]>[1];
//  filters?: FilterSpecification;
//  tooltip?: TooltipPopup;
//  cursorPointer?: boolean;
//
//
//  register(mc: MapController): void;
//}
