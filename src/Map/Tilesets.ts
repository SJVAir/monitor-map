import { Ref, ref } from "vue";
import { BaseTileset } from "./BaseLayerManagement";
import { OverlayTileSet } from "./OverlayManagement";
import type L from "../modules/Leaflet";
import type { IOverlayTileset, MapTilesetCollection } from "../types";

const _mapTilesets: MapTilesetCollection = [
  {
    label: "Streets",
    isDefault: true,
    svg: "road-svg",
    urlTemplate: "https://api.maptiler.com/maps/streets/256/{z}/{x}/{y}.png?key={apiKey}",
    options: {
      maxZoom: 19,
      apiKey: import.meta.env.VITE_MAPTILER_KEY,
      attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
    }
  },
  {
    label: "Satellite Hybrid",
    urlTemplate: "https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key={apiKey}",
    icon: "satellite_alt",
    containerClass: "has-text-silver",
    options: {
      maxZoom: 19,
      apiKey: import.meta.env.VITE_MAPTILER_KEY,
      attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
    }
  },
  {
    label: "Topographique",
    icon: "landscape",
    containerClass: "has-text-success",
    urlTemplate: "https://api.maptiler.com/maps/topographique/{z}/{x}/{y}.png?key={apiKey}",
    options: {
      maxZoom: 19,
      apiKey: import.meta.env.VITE_MAPTILER_KEY,
      attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
    }
  }
];

const _overlayTilesets: Array<IOverlayTileset> = [
  {
    containerClass: "has-text-info",
    icon: "air",
    isChecked: ref(false),
    label: "Wind",
    urlTemplate: "https://{s}.tile.openweathermap.org/map/wind/{z}/{x}/{y}.png?appid={apiKey}",
    options: {
      maxZoom: 19,
      attribution: 'Map data &copy; <a href="http://openweathermap.org">OpenWeatherMap</a>',
      apiKey: import.meta.env.VITE_OPENWEATHERMAP_KEY,
      opacity: 0.3,
      zIndex: 11
    }
  },
  {
    containerClass: "has-text-grey-light",
    icon: "cloud",
    isChecked: ref(false),
    label: "Clouds",
    urlTemplate: "https://{s}.tile.openweathermap.org/map/clouds/{z}/{x}/{y}.png?appid={apiKey}",
    options: {
      maxZoom: 19,
      attribution: 'Map data &copy; <a href="http://openweathermap.org">OpenWeatherMap</a>',
      apiKey: import.meta.env.VITE_OPENWEATHERMAP_KEY,
      opacity: 0.5,
      zIndex: 12
    }
  }
];

let mapTileSets: Array<BaseTileset>;
let overlayTilesets: Array<OverlayTileSet>;
let initialized = false;
export function initializeTilesets(map: L.Map) {
  mapTileSets = _mapTilesets.map(mts => new BaseTileset(map, mts));
  overlayTilesets = _overlayTilesets.map(ots => new OverlayTileSet(map, ots));
  
  initialized = true;
  return useMapTilesets();
}

export function useMapTilesets() {
  if (!initialized) {
    throw new Error("Tilesets called before initialization");
  }
  return { mapTileSets, overlayTilesets };
}
