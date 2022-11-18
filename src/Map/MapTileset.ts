import { toRaw } from "vue";
import L from "../modules/Leaflet";
import { activeOverlays } from "./OverlayTileset";
import type { ILeafletTileLayer, ITileLayerOptions } from "../types";

export let baseTileset: L.TileLayer;

export class MapTileset implements ILeafletTileLayer {
  containerClass?: string;
  isDefault?: boolean;
  icon?: string;
  svg?: string;
  label: string;
  options: ITileLayerOptions;
  urlTemplate: string;
  map: L.Map;

  constructor(map: L.Map, tileset: ILeafletTileLayer) {
    if ((tileset.svg && tileset.icon) || (!tileset.svg && !tileset.icon)) {
      throw new Error("Map Tileset must have either svg or icon");
    }
    this.containerClass = tileset.containerClass;
    this.isDefault = tileset.isDefault;
    this.icon = tileset.icon;
    this.svg = tileset.svg;
    this.label = tileset.label;
    this.options = tileset.options;
    this.urlTemplate = tileset.urlTemplate;
    this.map = map;
  }

  enable() {
    window.requestAnimationFrame(() => {
      if (baseTileset) {
        baseTileset.remove();
      }

      baseTileset = L.tileLayer(this.urlTemplate, this.options).addTo(toRaw(this.map));

      if (activeOverlays.size) {
        for (let layer of activeOverlays.values()) {
          layer.redraw();
        }
      }
    });
  }
}
