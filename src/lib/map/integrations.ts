import type { FilterSpecification, MapLayerEventType, Map as MaptilerMap, Popup } from "@maptiler/sdk";
import type { Feature, Geometry } from "geojson";
import { XMap } from "@tstk/builtin-extensions";
import type { MapController } from "./map.svelte";

interface TooltipController {
  tooltipPopup: Popup | null;
  map?: MaptilerMap;
}

export type TooltipPopup = <T extends TooltipController>(mapCtrl: T) => (evt: MapLayerEventType["mousemove"] & Object) => void;
export type SomeMapIntegration = MapIntegration | MapGeoJSONIntegration<any>;

export interface MapImageIcon {
  id: string;
  image: HTMLImageElement;
}

export class MapIconManager {
  protected icons: XMap<string, MapImageIcon> = new XMap();

  get(id: string): MapImageIcon | undefined {
    return this.icons.get(id);
  }

  has(id: string): boolean {
    return this.icons.has(id);
  }

  async loadIcons(map: MaptilerMap) {
    return await Promise.all(this.icons.values().map(icon => this.loadImage(icon, map)));
  }

  register(id: string, icon: HTMLImageElement) {
    this.icons.set(id, { id, image: icon });
  }

  protected async loadImage(icon: MapImageIcon, map: MaptilerMap): Promise<MaptilerMap> {
    if (!icon.image.complete) {
      return new Promise((resolve, reject) => {
        icon.image.onload = () => {
          resolve(map.addImage(icon.id, icon.image));
        };
        icon.image.onerror = (err) => {
          reject(new Error(`Failed to load image ${icon.id}: ${err}`, { cause: err }));
        }
      });
    } else {
      return Promise.resolve(map.addImage(icon.id, icon.image))
    }
  }
}

export abstract class MapIntegration {
  abstract referenceId: string;
  abstract mapLayer: Parameters<MaptilerMap["addLayer"]>[0];
  abstract enabled: boolean;
  beforeLayer?: string;

  applyTo(mc: MapController) {
    if (!mc.map) return;
    mc.map.addLayer(this.mapLayer, this.beforeLayer);

    const isVisible = mc.map.getLayoutProperty(this.referenceId, "visibility");

    if (this.enabled) {
      if (!isVisible || isVisible !== "visible") {
        mc.map.setLayoutProperty(this.referenceId, "visibility", "visible");
      }
    } else {
      if (!isVisible || isVisible === "visible") {
        mc.map.setLayoutProperty(this.referenceId, "visibility", "none");
      }
    }
  }

  register(mc: MapController) {
    this.applyTo(mc);
  }
}

export abstract class MapGeoJSONIntegration<T extends Record<string, any>> extends MapIntegration {
  abstract icons: MapIconManager;
  abstract features: Array<Feature<Geometry, T>>;
  abstract mapSource: Parameters<MaptilerMap["addSource"]>[1];
  abstract filters?: FilterSpecification;
  abstract tooltip?: TooltipPopup;
  cursorPointer?: boolean;

  async applyTo(mc: MapController) {
    if (!mc.map) return;

    await this.icons.loadIcons(mc.map);

    mc.map.addSource(this.referenceId, this.mapSource);

    super.applyTo(mc);
  }

  register(mc: MapController) {
    if (!mc.map) return;
    this.applyTo(mc);

    if (this.cursorPointer) {
      mc.map.on("mousemove", this.referenceId, () => {
        mc.map!.getCanvas().style.cursor = "pointer";
      });
      mc.map.on("mouseleave", this.referenceId, () => {
        mc.map!.getCanvas().style.cursor = "";
      });
    }
    if (this.tooltip) {
      const tooltip = this.tooltip(mc);

      mc.map.on("mousemove", this.referenceId, tooltip);
      mc.map.on("mouseleave", this.referenceId, () => {
        if (mc.tooltipPopup) mc.tooltipPopup.remove();
        mc.tooltipPopup = null;
      });
    }
  }
}
