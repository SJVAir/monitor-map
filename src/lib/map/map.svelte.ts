import { config, Map, Popup, MapStyle } from "@maptiler/sdk";
import { Singleton } from "@tstk/decorators";
import type { Feature, Geometry } from "geojson";
import { MonitorsController } from "$lib/monitors/monitors.svelte";
import { LoadingQueue } from "$lib/load-screen/load-screen.svelte.ts";
import { Initializer } from "$lib/decorators/initializer.ts";
import type { MonitorData, MonitorLatestType, SJVAirEntryLevel } from "@sjvair/sdk";
//import { WindLayer } from "@maptiler/weather";

interface MonitorMarkerProperties {
  //valueColor: string;
  //borderColor: string;
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

const mapLoading = Symbol();
const lq = new LoadingQueue();
const mc = new MonitorsController();
const defaultColor = "#969696" // light gray

@Singleton
export class MapController {
  map?: Map;

  constructor() {
    config.apiKey = import.meta.env.VITE_MAPTILER_KEY;
  }

  @Initializer
  init(container: string | HTMLElement) {
    lq.add(mapLoading);

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
      for (const [id, image] of Object.entries(mc.icons)) {
        this.map!.addImage(id, image);
      }

      //const layer = new WindLayer({
      //  opacity: 0.5,
      //}); // using default settings
      //this.map!.addLayer(layer);

      // NOTE: Cast to "any" to avoid type conflicts with MapLibre and Zod types
      const features: Array<Feature<Geometry, MonitorMarkerProperties>> = mc.latest.map(m => {
        const feature: Feature<Geometry, MonitorMarkerProperties> = {
          type: "Feature",
          properties: {
            //valueColor: defaultColor,
            //borderColor: darken(defaultColor, 0.1),
            //icon: getIcon(m)
            order: getOrder(m),
            icon: "default",
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
            //feature.properties.valueColor = level.color;
            //feature.properties.borderColor = darken(level.color, 0.1);
            feature.properties.icon = `${level.name}-${getIcon(m)}`;
            //feature.properties.icon = getIcon(m);
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

      this.map!.addLayer({
        id: "monitors",
        type: "symbol",
        source: "monitors",
        filter: ["all", ["==", ["get", "is_active"], true], ["!=", ["get", "location"], "outside"]],
        layout: {
          "symbol-sort-key": ["get", "order"],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-image": ["get", "icon"],
          "icon-size": 1,
          //"icon-size": 1.5
        },
        paint: {
          //"icon-color": ["get", "valueColor"],
          //"icon-halo-color": ["get", "borderColor"],
          //"icon-halo-width": 2.2,

          //"circle-radius": 10,
          //"circle-color": ["get", "valueColor"],
          //"circle-stroke-width": 2,
          //"circle-stroke-color": ["get", "borderColor"]
        },
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

      lq.remove(mapLoading);
    });
  }

  remove() {
    return this.map?.remove();
  }
}
