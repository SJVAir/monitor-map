import { ref } from "vue";
import { useInteractiveMap } from "./InteractiveMap";
import { OverlayTileSet } from "./OverlayTileset";
import type { IOverlayTileset } from "../types";

const tilesets: Array<IOverlayTileset> = [
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

let overlayTilesets: Array<OverlayTileSet>;
let initialized = false;

export async function useOverlayTilesets() {
  if (!initialized) {
    await initializeTilesets();
  }
  return overlayTilesets;
}

async function initializeTilesets() {
  const { map } = await useInteractiveMap();

  overlayTilesets = tilesets.map(ots => new OverlayTileSet(map, ots));
  
  initialized = true;
}
