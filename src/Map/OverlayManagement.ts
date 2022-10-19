import {toRaw} from "vue";
import L from "../modules/Leaflet";
import type { IOverlayTileset, ITileLayerOptions } from "../types";

export const activeOverlays: Map<string, L.TileLayer> = new Map();

export class OverlayTileSet implements IOverlayTileset {
  containerClass?: string;
  icon?: string;
  isChecked: boolean;
  label: string;
  urlTemplate: string;
  options: ITileLayerOptions;
  map: L.Map;

  constructor(map: L.Map, tileset: IOverlayTileset) {
    this.containerClass = tileset.containerClass || "";
    this.icon = tileset.icon
    this.isChecked = tileset.isChecked;
    this.label = tileset.label;
    this.urlTemplate = tileset.urlTemplate;
    this.options = tileset.options;
    this.map = map;
  }

  enable() {
    const layer = L.tileLayer(this.urlTemplate, this.options).addTo(toRaw(this.map));
    activeOverlays.set(this.label, layer);
  }

  disable() {
    if (activeOverlays.has(this.label)) {
      activeOverlays.get(this.label)!.remove();
      activeOverlays.delete(this.label);
    }

  }
}
