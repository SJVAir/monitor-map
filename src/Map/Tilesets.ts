import { Ref, ref } from "vue";
import { BaseTileset } from "./BaseLayerManagement";
import { OverlayTileSet } from "./OverlayManagement";
import type L from "../modules/Leaflet";
import type { IOverlayTileset, MapTilesetCollection } from "../types";

export const mapTilesets: MapTilesetCollection = [
  {
    label: "Streets",
    isDefault: true,
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
    options: {
      maxZoom: 19,
      apiKey: import.meta.env.VITE_MAPTILER_KEY,
      attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
    }
  },
  {
    label: "Topographique",
    urlTemplate: "https://api.maptiler.com/maps/topographique/{z}/{x}/{y}.png?key={apiKey}",
    options: {
      maxZoom: 19,
      apiKey: import.meta.env.VITE_MAPTILER_KEY,
      attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
    }
  }
];

export const overlayTilesets: Array<IOverlayTileset> = [
  {
    containerClass: "has-text-info",
    icon: "air",
    isChecked: false,
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
    isChecked: false,
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

export function getReactiveTilesets(map: L.Map): {
  $mapTileSets: Ref<Array<BaseTileset>>,
  $overlayTilesets: Ref<Array<OverlayTileSet>>
} {
  const $mapTileSets = ref(
    mapTilesets.map(mts => new BaseTileset(map, mts))
  ) as Ref<Array<BaseTileset>>;
  
  const $overlayTilesets = ref(overlayTilesets.map(ots => new OverlayTileSet(map, ots))) as Ref<Array<OverlayTileSet>>;
  
  return { $mapTileSets, $overlayTilesets };
}
