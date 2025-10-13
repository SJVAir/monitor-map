import type { FilterSpecification, MapLayerEventType, Map as MaptilerMap, Popup } from "@maptiler/sdk";
import { Singleton } from "@tstk/decorators";
import type { Feature, Geometry } from "geojson";

interface TooltipController {
  tooltipPopup: Popup | null;
  map: MaptilerMap;
}
export type TooltipPopup = <T extends TooltipController>(mapCtrl: T) => (evt: MapLayerEventType["mousemove"] & Object) => void;

export interface MyMapIntegration {
  referenceId: string;
  beforeLayer?: string;
  mapLayer: Parameters<MaptilerMap["addLayer"]>[0];
}

//export interface MapGeoJSONIntegration<T extends Record<string, any>> extends MapIntegration {
//  icons: Record<string, HTMLImageElement>;
//  features: Array<Feature<Geometry, T>>;
//  mapSource: Parameters<MaptilerMap["addSource"]>[1];
//  filters?: FilterSpecification;
//  tooltip?: TooltipPopup;
//}

//abstract class MapIntegration {
//  abstract referenceId: string;
//  abstract beforeLayer?: string;
//}

export abstract class MapIntegration implements MyMapIntegration {
  abstract mapLayer: any;
  abstract referenceId: string;
  abstract enabled: boolean;
  beforeLayer?: string;
}

export abstract class MapGeoJSONIntegration<T extends Record<string, any>> extends MapIntegration {
  abstract icons: Record<string, HTMLImageElement>;
  abstract features: Array<Feature<Geometry, T>>;
  abstract mapSource: Parameters<MaptilerMap["addSource"]>[1];
  abstract filters?: FilterSpecification;
  abstract tooltip?: TooltipPopup;
}

//@Singleton
//export class MapIntegrations {
//  private integrations: Map<string, new (...args: Array<any>) => MapIntegrationBase> = new Map();
//
//  add(key: string, integration: new (...args: Array<any>) => MapIntegrationBase) {
//    this.integrations.set(key, integration);
//  }
//}


//export function MapIntegration(meta: { referenceId: string; beforeLayer?: string }) {
//  const integrations = new MapIntegrations();
//
//  return function <T extends new (...args: Array<any>) => any>(
//    target: T,
//  ): T {
//    const newClass = class extends Singleton(target) {
//      referenceId = meta.referenceId;
//      beforeLayer = meta.beforeLayer;
//    }
//
//    integrations.add(meta.referenceId, newClass);
//    return newClass;
//  }
//}
