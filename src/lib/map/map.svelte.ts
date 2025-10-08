import { config, Map, Popup, MapStyle } from "@maptiler/sdk";
import { Singleton } from "@tstk/decorators";
import type { Feature, Geometry } from "geojson";
import { MonitorsController } from "$lib/monitors/monitors.svelte";
import { Initializer } from "$lib/decorators/initializer.ts";
import type { MonitorData } from "@sjvair/sdk";
import { LoadingScreen } from "$lib/loading/screen/load-screen.svelte.ts";
import { Reactive } from "$lib/reactivity.svelte";
import { WindLayer } from "@maptiler/weather";

interface MonitorMarkerProperties {
  icon: string;
  is_sjvair?: boolean;
  is_active: boolean;
  location: string;
  name: string;
  order: number;
  type: string;
  value: string;
}

function getIcon<T extends MonitorData>(monitor: T): string {
  switch (monitor.type) {
    case "airgradient":
      return "circle";

    case "airnow":
    case "aqview":
    case "bam1022":
      return "triangle";

    case "purpleair":
      return monitor.is_sjvair ? "circle" : "square";

    default:
      throw new Error(`Map icon for ${monitor.device} has not been set`);
  }
}

function getOrder<T extends MonitorData>(monitor: T): number {
  switch (monitor.type) {
    case "airgradient":
      return 5;

    case "airnow":
      return 2;

    case "aqview":
      return 3;

    case "bam1022":
      return 6;

    case "purpleair":
      return monitor.is_sjvair ? 4 : 1;

    default:
      throw new Error(`Map ordering for ${monitor.device} has not been set`);
  }
}

async function loadImage(icon: [string, HTMLImageElement], map: Map): Promise<Map> {
  const [id, image] = icon;

  return new Promise((resolve, reject) => {
    image.onload = () => {
      resolve(map.addImage(id, image));
    };
    image.onerror = (err) => {
      throw new Error(`Failed to load image ${id}: ${err}`, { cause: err });
    }
  });
}

const mc = new MonitorsController();

@Singleton
export class MapController {
  map!: Map;

  @Reactive()
  accessor initialized: boolean = false;


  constructor() {
    config.apiKey = import.meta.env.VITE_MAPTILER_KEY;
  }

  @Initializer
  init(container: string | HTMLElement) {

    this.map = new Map({
      container,
      center: [-119.7987626619462, 36.76272050981146],
      zoom: 7,
      style: MapStyle.STREETS,
      projection: "globe",
      space: {
        preset: "milkyway"
      }
    });

    const levels = mc.meta.entryType(mc.pollutant).asIter.levels;

    this.map.on("load", async () => {
      for (const icon of Object.entries(mc.icons)) {
        await loadImage(icon, this.map!);
      }

      //const layer = new WindLayer({
      //  opacity: 0.5,
      //}); // id is "MapTiler Wind"
      //this.map!.addLayer(layer);

      // NOTE: Cast to "any" to avoid type conflicts with MapLibre and Zod types
      const features: Array<Feature<Geometry, MonitorMarkerProperties>> = mc.latest.map(m => {
        const feature: Feature<Geometry, MonitorMarkerProperties> = {
          type: "Feature",
          properties: {
            order: getOrder(m),
            icon: "outside-default-square",
            location: m.location,
            name: m.name,
            value: m.latest.value,
            type: m.type,
            is_sjvair: m.is_sjvair,
            is_active: m.is_active
          },
          geometry: m.position! as Geometry
        };

        if (levels) {
          const level = levels.find(lvl => {
            const value = parseInt(m.latest.value, 10);
            return value >= lvl.range[0] && value <= lvl.range[1];
          });

          if (level) {
            feature.properties.icon = `${m.location}-${m.is_active ? level.name : "default"}-${getIcon(m)}`;
          }
        }

        return feature;
      });

      this.map!.addSource("monitors", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features
        }
      });

      this.initialized = true;
      this.map!.addLayer({
        id: "monitors",
        type: "symbol",
        source: "monitors",
        filter: ["all", ["==", ["get", "is_active"], true], ["==", ["get", "location"], "outside"]],
        layout: {
          "symbol-sort-key": ["get", "order"],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-image": ["get", "icon"],
          "icon-size": 1,
        },
        paint: {},
      });

      // Popup on hover
      let popup: any;
      this.map!.on("mousemove", "monitors", (e: any) => {
        const feature = e.features && e.features[0];
        if (!feature) return;

        // Remove previous popup
        if (popup) popup.remove();

        popup = new Popup({ closeButton: false, closeOnClick: false })
          .setLngLat(e.lngLat)
          .setHTML(`<div>
            <strong>${feature.properties.name}</strong>
            <br/>
            Value: ${feature.properties.value}PM2.5
            <br/>
            location: ${feature.properties.location}
          </div>`)
          .addTo(this.map!);
      });

      this.map!.on("mouseleave", "monitors", () => {
        if (popup) popup.remove();
        popup = null;
      });

      this.map!.on("zoom", (e: any) => {
        if (popup) popup.remove();
      });

      new LoadingScreen().disable();
    });

  }

  remove() {
    return this.map?.remove();
  }
}
