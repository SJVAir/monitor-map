import { watch } from "vue";
import L from "../modules/Leaflet";
import { useInteractiveMap } from "./InteractiveMap";
import { asyncInitializer } from "../modules";
import { RadioConfig, RadioOption } from "../DisplayOptions";
import type { Ref } from "vue";
import type { TileLayer, TileLayerOptions } from "../modules/Leaflet";

type TileLayerConfig = TileLayer & RadioConfig;
export class TileLayerOption extends RadioOption<TileLayerConfig> implements TileLayerConfig {
  options: TileLayerOptions;
  urlTemplate: string;

  constructor(sharedModel: Ref<string>, value: string, config: TileLayerConfig) {
    super(sharedModel, value, config);
    this.options = config.options;
    this.urlTemplate = config.urlTemplate;
  }
}

const mapTilesets: Record<string, TileLayerOption> = TileLayerOption.defineOptions<TileLayerOption, TileLayerConfig>({ 
  streets: {
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
  satellite: {
    label: "Satellite Hybrid",
    urlTemplate: "https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key={apiKey}",
    icon: {
      id: "satellite_alt"
    },
    containerClass: "has-text-silver",
    options: {
      maxZoom: 19,
      apiKey: import.meta.env.VITE_MAPTILER_KEY,
      attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
    }
  },
  topographique: {
    label: "Topographique",
    icon: {
      id: "landscape"
    },
    containerClass: "has-text-success",
    urlTemplate: "https://api.maptiler.com/maps/topographique/{z}/{x}/{y}.png?key={apiKey}",
    options: {
      maxZoom: 19,
      apiKey: import.meta.env.VITE_MAPTILER_KEY,
      attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
    }
  }
});

export const useMapTilesets = asyncInitializer<Record<string, TileLayerOption>>((resolve, reject) => {
  useInteractiveMap()
    .then(({ map }) => {
      const { streets } = mapTilesets;
      let currentTileset = streets.label;
      let baseTileset = L.tileLayer(streets.urlTemplate, streets.options).addTo(map);

      watch(
        () => Object.values(mapTilesets)[0].model,
        (tilesetKey) => {
          console.log("running watcher, tilesetkey: ", tilesetKey)
          //window.requestAnimationFrame(() => {
          //  if (isChecked) {
          //    Object.values(mapTilesets).find(ts => ts.label === currentTileset)!.model.value = false;
          //    baseTileset.remove();

          //    const tileset = Object.values(mapTilesets).find(ts => ts.model.value === true)!;
          //    console.log("tileset: ", tileset)
          //    console.log("maptTilesets: ", mapTilesets);
          //    baseTileset = L.tileLayer(tileset.urlTemplate, tileset.options).addTo(map);

          //    if (activeOverlays.size) {
          //      for (let layer of activeOverlays.values()) {
          //        layer.redraw();
          //      }
          //    }
          //  }
          //});
        }
      );

      resolve(mapTilesets);
    })
    .catch(reject);
});
