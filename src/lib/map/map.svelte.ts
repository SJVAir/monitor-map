import { config, Map, MapStyle } from "@maptiler/sdk";
import { Singleton } from "@tstk/decorators";
import type { Feature, Geometry } from "geojson";
//import { darken } from "color2k";
import { MonitorsController } from "$lib/monitors/monitors.svelte";
import { LoadingQueue } from "$lib/load-screen/load-screen.svelte.ts";
import { Initializer } from "$lib/decorators/initializer.ts";
import { Icons } from "./icons";
import type { MonitorData, SJVAirEntryLevel } from "@sjvair/sdk";
//import { WindLayer } from "@maptiler/weather";

interface MonitorMarkerProperties {
  //valueColor: string;
  //borderColor: string;
  order: number;
  icon: string;
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

function buildIcons(levels: Array<SJVAirEntryLevel> | null) {
  const borderWidth = 2;
  const icons: Record<string, HTMLImageElement> = {};

  const greySquareIcon = new Image();
  greySquareIcon.src = Icons.square(defaultColor, 2);
  greySquareIcon.width = 24;
  greySquareIcon.height = 24;

  icons["default"] = greySquareIcon;

  if (levels) {
    for (const level of levels) {
      for (const [shape, svg] of Object.entries(Icons)) {
        shape
        const icon = new Image();
        icon.src = svg(level.color, borderWidth);
        icon.width = 24;
        icon.height = 24;
        icons[`${level.name}-${shape}`] = icon;
      }
      //const icon = new Image();
      //icon.src = Icons.square(level.color);
      //icon.width = 24;
      //icon.height = 24;
      //icons[`${level.name}-square`] = icon;
    }
  }

  return icons;
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
      zoom: 6,
      style: MapStyle.STREETS,
      projection: "globe",
      space: {
        preset: "milkyway"
      }
    });

    const levels = mc.meta.entryType(mc.pollutant).asIter.levels;
    const icons = buildIcons(levels);

    this.map.on("load", async () => {
      for (const [id, image] of Object.entries(icons)) {
        this.map!.addImage(id, image);
      }

      //const layer = new WindLayer({
      //  opacity: 0.5,
      //}); // using default settings
      //this.map!.addLayer(layer);
      //for (const monitorMeta of mc.meta.asIter.monitors) {
      //  const monitors = mc.latest.filter(m => m.type === monitorMeta.type)

      //  // NOTE: Cast to "any" to avoid type conflicts with MapLibre and Zod types
      //  const features: Array<Feature<Geometry, MonitorMarkerProperties>> = monitors.map(m => {
      //    const feature: Feature<Geometry, MonitorMarkerProperties> = {
      //      type: "Feature",
      //      properties: {
      //        valueColor: defaultColor,
      //        borderColor: darken(defaultColor, 0.1),
      //        //icon: getIcon(m)
      //        icon: "default"
      //      },
      //      geometry: m.position! as Geometry
      //    };

      //    if (levels) {
      //      const level = levels.find(lvl => {
      //        const value = parseInt(m.latest.value, 10);
      //        return value >= lvl.range[0] && value <= lvl.range[1];
      //      });

      //      if (level) {
      //        feature.properties.valueColor = level.color;
      //        feature.properties.borderColor = darken(level.color, 0.1);
      //        feature.properties.icon = `${level.name}-${getIcon(m)}`;
      //        //feature.properties.icon = getIcon(m);
      //      }
      //    }


      //    return feature;
      //  });

      //  this.map!.addSource(monitorMeta.type, {
      //    type: "geojson",
      //    data: {
      //      type: "FeatureCollection",
      //      features
      //    }
      //  });

      //  this.map!.addLayer({
      //    id: monitorMeta.type,
      //    type: "symbol",
      //    source: monitorMeta.type,
      //    layout: {
      //      "icon-allow-overlap": true,
      //      "icon-ignore-placement": true,
      //      "icon-image": ["get", "icon"],
      //      "icon-size": 1
      //      //"icon-size": 1.5
      //    },
      //    paint: {
      //      //"icon-color": ["get", "valueColor"],
      //      //"icon-halo-color": ["get", "borderColor"],
      //      //"icon-halo-width": 2.2,

      //      //"circle-radius": 10,
      //      //"circle-color": ["get", "valueColor"],
      //      //"circle-stroke-width": 2,
      //      //"circle-stroke-color": ["get", "borderColor"]
      //    },
      //  });
      //}

      // NOTE: Cast to "any" to avoid type conflicts with MapLibre and Zod types
      const features: Array<Feature<Geometry, MonitorMarkerProperties>> = mc.latest.map(m => {
        const feature: Feature<Geometry, MonitorMarkerProperties> = {
          type: "Feature",
          properties: {
            //valueColor: defaultColor,
            //borderColor: darken(defaultColor, 0.1),
            //icon: getIcon(m)
            order: getOrder(m),
            icon: "default"
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
        layout: {
          "symbol-sort-key": ["get", "order"],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-image": ["get", "icon"],
          "icon-size": 1
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

      lq.remove(mapLoading);
    });
  }

  remove() {
    return this.map?.remove();
  }
}
