import { MonitorsController } from "$lib/monitors/monitors.svelte";
import { config, Map, MapStyle } from "@maptiler/sdk";
import { Singleton } from "@tstk/decorators";
import { LoadingQueue } from "$lib/load-screen/load-screen.svelte.ts";
import { Initializer } from "$lib/decorators/initializer.ts";
import { WindLayer } from "@maptiler/weather";

// After creating a Map instance like in the `Getting Started`

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
      //const layer = new WindLayer({
      //  opacity: 0.5,
      //}); // using default settings
      //this.map!.addLayer(layer);
      for (const monitorMeta of mc.meta.asIter.monitors) {
        const monitors = mc.latest.filter(m => m.type === monitorMeta.type)
        const levels = Object.values(mc.meta.entries[mc.pollutant].levels!);

        // NOTE: Cast to "any" to avoid type conflicts with MapLibre and Zod types
        const features = monitors.map(m => {
          const level = levels.find(lvl => {
            const value = parseInt(m.latest.value, 10);
            return value >= lvl.range[0] && value <= lvl.range[1];
          });

          return {
            type: "Feature",
            properties: {
              valueColor: level?.color
            },
            geometry: m.position!
          } as const;
        }) as any;

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
          paint: {
            'circle-radius': 8,
            'circle-color': ['get', 'valueColor']
          }
        });
      }

      lq.remove(mapSymbol);
    });
  }

  remove() {
    return this.map?.remove();
  }
}
