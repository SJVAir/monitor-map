import L from "../modules/Leaflet";
import { activeOverlays } from "./OverlayManagement";
import type { ILeafletTileLayer, ITileLayerOptions } from "../types";
import {toRaw} from "vue";

export let baseTileset: L.TileLayer;

export class BaseTileset implements ILeafletTileLayer {
  isDefault?: boolean;
  label: string;
  options: ITileLayerOptions;
  urlTemplate: string;
  map: L.Map;

  constructor(map: L.Map, tileset: ILeafletTileLayer) {
    this.isDefault = tileset.isDefault;
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
