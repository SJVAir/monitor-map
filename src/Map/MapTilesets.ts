import { useInteractiveMap } from "./InteractiveMap";
import { MapTileset } from "./MapTileset";
import type { MapTilesetCollection } from "../types";

const tilesets: MapTilesetCollection = [
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

let mapTileSets: Array<MapTileset>;
let initialized = false;

export async function useMapTilesets() {
  if (!initialized) {
    await initializeTilesets();
  }
  return mapTileSets;
}

async function initializeTilesets() {
  const { map } = await useInteractiveMap();

  mapTileSets = tilesets.map(mts => new MapTileset(map, mts));
  
  mapTileSets.find(ts => ts.isDefault)?.enable();

  initialized = true;
}
