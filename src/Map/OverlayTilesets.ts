import { ref, watch } from "vue";
import L from "../modules/Leaflet";
import { asyncInitializer } from "../modules";
import { useInteractiveMap } from "./InteractiveMap";
import { DisplayOptionTileLayer } from "../DisplayOptions";

const overlayTilesets = DisplayOptionTileLayer.defineOptions({
  wind: {
    containerClass: "has-text-info",
    icon: {
      id: "air"
    },
    value: "wind",
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
  clouds: {
    containerClass: "has-text-grey-light",
    icon: {
      id: "cloud"
    },
    model: ref("clouds"),
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
});

export const useOverlayTilesets = asyncInitializer<TileLayerDisplayOptions>((resolve, reject) => {
  useInteractiveMap()
    .then(({ map }) => {
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

      resolve(overlayTilesets);
    })
    .catch(reject);
});
