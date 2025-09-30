import { config, Map, MapStyle } from "@maptiler/sdk";
import { Singleton } from "@tstk/decorators";

@Singleton
export class MapController {
  private _map?: Map;

  constructor() {
    config.apiKey = import.meta.env.VITE_MAPTILER_KEY;
  }

  get map() {
    if (!this._map) {
      throw new Error("Map is not initialized. Call init() first.");
    }

    return this._map;
  }

  init(container: string | HTMLElement) {
    this._map = new Map({
      container,
      center: [-119.7987626619462, 36.76272050981146],
      zoom: 6,
      style: MapStyle.STREETS,
      projection: "globe",
    });
  }

  remove() {
    return this.map.remove();
  }
}
