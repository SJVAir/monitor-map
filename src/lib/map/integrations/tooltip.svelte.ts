import type { MapLayerEventType, Popup } from "@maptiler/sdk";
import { MapController } from "../map.svelte";
import { XMap } from "@tstk/builtin-extensions";

export type TooltipBuilder = (evt: MapLayerEventType["mousemove"] & Object) => Popup | void;

function handleZoom() {
  if (TooltipManager.tooltip) TooltipManager.tooltip.remove();
  TooltipManager.tooltip = null;
}

export class TooltipManager {
  static mapCtrl: MapController = new MapController();
  static tooltip: Popup | null = null;

  private isEnabled: boolean = false;
  private _tooltips: XMap<string, TooltipHandle> = new XMap();

  get tooltips(): MapIterator<TooltipHandle> {
    return this._tooltips.values();
  }

  enable() {
    if (!TooltipManager.mapCtrl.map || this.isEnabled) return;
    TooltipManager.mapCtrl.map.on("zoom", handleZoom);
    this.isEnabled = true;
  }

  disable() {
    if (!TooltipManager.mapCtrl.map || !this.isEnabled) return;
    TooltipManager.mapCtrl.map.off("zoom", handleZoom);
    for (const tooltip of this.tooltips) {
      tooltip.disable();
    }
    this.isEnabled = false;
  }

  get(layerId: string) {
    return this._tooltips.get(layerId);
  }

  has(layerId: string) {
    return this._tooltips.has(layerId);
  }

  register(layerId: string, builder: TooltipBuilder) {
    const tooltipHandle = new TooltipHandle(layerId, builder);
    this._tooltips.set(layerId, tooltipHandle);

    return tooltipHandle;
  }

  with(layerId: string | Array<string>, cb: (tooltip: TooltipHandle) => void) {
    layerId = Array.isArray(layerId) ? layerId : [layerId];

    for (const id of layerId) {
      const tooltip = this._tooltips.get(id);
      if (tooltip) cb(tooltip);
    }
  }
}

class TooltipHandle {
  layerId: string;

  private clearTooltip: () => void;
  private isEnabled: boolean = false;
  private setTooltip: (evt: MapLayerEventType["mousemove"] & Object) => void;


  constructor(layerId: string, builder: TooltipBuilder) {
    this.layerId = layerId;
    this.setTooltip = (evt: MapLayerEventType["mousemove"] & Object) => {
      if (!TooltipManager.mapCtrl.map || !evt.features) return;

      TooltipManager.tooltip?.remove();

      const tooltip = builder(evt);

      if (tooltip) {
        TooltipManager.tooltip = tooltip;
        TooltipManager.tooltip.addTo(TooltipManager.mapCtrl.map);
      }
    };

    this.clearTooltip = () => {
      if (TooltipManager.tooltip) {
        TooltipManager.tooltip.remove();
        TooltipManager.tooltip = null;
      }
    };
  }

  enable() {
    if (!TooltipManager.mapCtrl.map || this.isEnabled) return;

    TooltipManager.mapCtrl.map.on("mousemove", this.layerId, this.setCursorPointer);
    TooltipManager.mapCtrl.map.on("mouseleave", this.layerId, this.setCursorDefault);

    TooltipManager.mapCtrl.map.on("mousemove", this.layerId, this.setTooltip);
    TooltipManager.mapCtrl.map.on("mouseleave", this.layerId, this.clearTooltip);

    this.isEnabled = true;
  }

  disable() {
    if (!TooltipManager.mapCtrl.map || !this.isEnabled) return;

    TooltipManager.tooltip?.remove();

    TooltipManager.mapCtrl.map.off("mousemove", this.layerId, this.setCursorPointer);
    TooltipManager.mapCtrl.map.off("mouseleave", this.layerId, this.setCursorDefault);

    TooltipManager.mapCtrl.map.off("mousemove", this.layerId, this.setTooltip);
    TooltipManager.mapCtrl.map.off("mouseleave", this.layerId, this.clearTooltip);

    this.isEnabled = false;
  }

  private setCursorPointer() {
    TooltipManager.mapCtrl.map!.getCanvas().style.cursor = "pointer";
  }

  private setCursorDefault() {
    TooltipManager.mapCtrl.map!.getCanvas().style.cursor = "";
  }

}
