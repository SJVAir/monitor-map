import L from "leaflet";
import "leaflet-svg-shape-markers";
import "leaflet.markercluster";

export default L;

export interface TileLayer {
  options: TileLayerOptions;
  urlTemplate: string;
}

export interface TileLayerOptions extends L.TileLayerOptions {
  apiKey?: string;
}
