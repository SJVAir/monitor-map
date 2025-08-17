import { watch } from "vue";
import L from "../modules/Leaflet";
import { asyncInitializer } from "../modules";
import { useInteractiveMap } from "../Map/InteractiveMap";
import { Checkbox, DisplayOptionProps } from "./mod";
import type { CheckboxConfig, DisplayOptionRecord } from "./mod";
import type { TileLayer, TileLayerOptions } from "../modules/Leaflet";

// @NOTE: Cloud and wind overlays removed in 12e8887b

type OverlayConfig = TileLayer & CheckboxConfig;
export class MapOverlayOption extends Checkbox<OverlayConfig> implements TileLayer {
  options: TileLayerOptions;
  urlTemplate: string;

  constructor(config: OverlayConfig) {
    super(config);
    this.options = config.options;
    this.urlTemplate = config.urlTemplate;
  }
}

//interface OverlayOptionClass extends OverlayOption {};
const overlayTilesets: DisplayOptionRecord<MapOverlayOption> = MapOverlayOption.defineOptions<MapOverlayOption, OverlayConfig>({
  wind: {
    containerClass: "has-text-info",
    icon: {
      id: "air"
    },
    model: false,
    label: "Wind",
    urlTemplate: "https://{s}.tile.openweathermap.org/map/wind/{z}/{x}/{y}.png?appid={apiKey}",
    options: {
      maxZoom: 19,
      attribution: 'Map data &copy; <a href="http://openweathermap.org">OpenWeatherMap</a>',
      apiKey: import.meta.env.VITE_OPENWEATHERMAP_KEY,
      opacity: 0.3,
      zIndex: 12
    }
  },
  clouds: {
    containerClass: "has-text-grey-light",
    icon: {
      id: "cloud"
    },
    model: false,
    label: "Clouds",
    urlTemplate: "https://{s}.tile.openweathermap.org/map/clouds/{z}/{x}/{y}.png?appid={apiKey}",
    options: {
      maxZoom: 19,
      attribution: 'Map data &copy; <a href="http://openweathermap.org">OpenWeatherMap</a>',
      apiKey: import.meta.env.VITE_OPENWEATHERMAP_KEY,
      opacity: 0.5,
      zIndex: 13
    }
  }
});

interface OverlayTilesetsModule {
  activeOverlays: Map<string, L.TileLayer>;
  displayOptions: DisplayOptionProps<MapOverlayOption>
}

export const useOverlayTilesets = asyncInitializer<OverlayTilesetsModule>(async (resolve) => {
  const { map } = await useInteractiveMap();
  const activeOverlays: Map<string, L.TileLayer> = new Map();
  const sources = Object.values(overlayTilesets).map(ts => () => ts.model.value);

  watch(
    sources,
    () => {
      const newActive = Object.values(overlayTilesets).filter(ts => ts.model.value === true && !activeOverlays.has(ts.label))
      const newRemove = Object.values(overlayTilesets).filter(ts => ts.model.value === false && activeOverlays.has(ts.label))

      newActive.forEach(ts => {
        const layer = L.tileLayer(ts.urlTemplate, ts.options).addTo(map);
        activeOverlays.set(ts.label, layer);
      })

      newRemove.forEach(ts => {
        activeOverlays.get(ts.label)!.remove();
        activeOverlays.delete(ts.label);
      });
    }
  );

  resolve({
    activeOverlays,
    displayOptions: {
      label: "Map Overlays",
      options: overlayTilesets
    }
  });
});
