import { MonitorsController } from "$lib/monitors/monitors.svelte";
import { config, Map, MapStyle } from "@maptiler/sdk";
import { Singleton } from "@tstk/decorators";
import { LoadingQueue } from "$lib/load-screen/load-screen.svelte.ts";
import { Initializer } from "$lib/decorators/initializer.ts";

const mapSymbol = Symbol();
const lq = new LoadingQueue();
const mc = new MonitorsController();

@Singleton
export class MapController {
  map?: Map;

  constructor() {
    config.apiKey = import.meta.env.VITE_MAPTILER_KEY;
  }

  @Initializer
  init(container: string | HTMLElement) {
    lq.add(mapSymbol);

    this.map = new Map({
      container,
      center: [-119.7987626619462, 36.76272050981146],
      zoom: 6,
      style: MapStyle.STREETS,
      projection: "globe",
    });

    this.map.on("load", () => {
      for (const monitorMeta of mc.meta.asIter.monitors) {
        const monitors = mc.latest.filter(m => m.type === monitorMeta.type)
        const features = monitors.map(m => ({
          "type": "Feature",
          "properties": {},
          "geometry": m.position
        })) as any;

        this.map!.addSource(monitorMeta.type, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features
          }
        });

        this.map!.addLayer({
          id: monitorMeta.type,
          type: "circle",
          source: monitorMeta.type,
          layout: {
            //'icon-image': 'plane',
            //'icon-size': ['*', ['get', 'scalerank'], 0.01]
          },
          paint: {}
        });
      }

      lq.remove(mapSymbol);
    });
  }

  remove() {
    return this.map?.remove();
  }
}
