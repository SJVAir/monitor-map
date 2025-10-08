import { Popup, type ExpressionSpecification, type FilterSpecification, type Map as MaptilerMap } from "@maptiler/sdk";
import { Singleton } from "@tstk/decorators";
import { cast } from "@tstk/utils";
import type { Feature, Geometry } from "geojson";
import { Derived } from "$lib/reactivity.svelte.ts";
import { asDataURI, circle, square, triangle } from "$lib/map/icons.ts";
import type { MapIntegration, TooltipPopup } from "$lib/map/types";
import { MonitorsController } from "./monitors.svelte";
import type { MonitorData, MonitorType } from "@sjvair/sdk";

export type MonitorMapFeature = Feature<Geometry, MonitorMarkerProperties>;

export interface MonitorMarkerProperties {
  icon: string;
  is_sjvair?: boolean;
  is_active: boolean;
  location: string;
  name: string;
  order: number;
  type: string;
  value: string;
}

const MONITOR_ICONS = { circle, square, triangle };
const MONITOR_ICON_BORDER_WIDTH = 2;
const MONITOR_ICON_DEFAULT_COLOR = "#969696"; // light gray

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

const filters = {
  monitor(deviceType: MonitorType): ExpressionSpecification {
    return ["==", ["get", "type"], deviceType]
  },
  purpleair(): ExpressionSpecification {
    return ["all", ["==", ["get", "type"], "purpleair"], ["==", ["get", "is_sjvair"], false]]
  },
  sjvPurpleair(): ExpressionSpecification {
    return ["all", ["==", ["get", "type"], "purpleair"], ["==", ["get", "is_sjvair"], true]]
  },
};

@Singleton
export class MonitorsMapIntegration implements MapIntegration<MonitorMarkerProperties> {
  referenceId: string = "monitors";

  tooltip: TooltipPopup = (mapCtrl) => (evt) => {
    if (!evt.features) return;

    const feature = cast<MonitorMapFeature, Array<MonitorMapFeature>>(
      evt.features,
      features => {
        features.sort((a, b) => b.properties.order - a.properties.order);
        return features[0];
      }
    );

    if (!feature) return;

    // Remove previous popup
    if (mapCtrl.tooltipPopup) mapCtrl.tooltipPopup.remove();

    mapCtrl.tooltipPopup = new Popup({ closeButton: false, closeOnClick: false })
      .setLngLat(evt.lngLat)
      .setHTML(`<div>
            <strong>${feature.properties.name}</strong>
            <br/>
            Value: ${feature.properties.value}PM2.5
            <br/>
            location: ${feature.properties.location}
          </div>`)
      .addTo(mapCtrl.map);
  }


  @Derived(() => {
    const levels = new MonitorsController().levels;
    const icons: Record<string, HTMLImageElement> = {};

    if (levels) {
      for (const location of ["inside", "outside"]) {
        for (const [shapeName, shape] of Object.entries(MONITOR_ICONS)) {
          const defaultIcon = new Image();

          defaultIcon.src = asDataURI(shape(
            MONITOR_ICON_DEFAULT_COLOR,
            MONITOR_ICON_BORDER_WIDTH,
            (location === "inside") ? "#000000" : undefined
          ));
          defaultIcon.width = 24;
          defaultIcon.height = 24;

          icons[`${location}-default-${shapeName}`] = defaultIcon;

          for (const level of levels) {
            const icon = new Image();
            icon.src = asDataURI(shape(
              level.color,
              MONITOR_ICON_BORDER_WIDTH,
              (location === "inside") ? "#000000" : undefined
            ));
            icon.width = 24;
            icon.height = 24;
            icons[`${location}-${level.name}-${shapeName}`] = icon;
          }
        }
      }
    }

    return icons;
  })
  accessor icons!: Record<string, HTMLImageElement>;

  @Derived((): FilterSpecification => {
    const mc = new MonitorsController();
    const monitorFilters: ExpressionSpecification = ["any"];
    const locationFilters: ExpressionSpecification = ["any", ["==", ["get", "location"], "outside"]];
    const statusFilters: ExpressionSpecification = ["any", ["==", ["get", "is_active"], true]];

    if (mc.displayToggles.purpleair) monitorFilters.push(filters.purpleair());
    if (mc.displayToggles.aqview) monitorFilters.push(filters.monitor("aqview"));
    if (mc.displayToggles.bam1022) monitorFilters.push(filters.monitor("bam1022"));
    if (mc.displayToggles.airnow) monitorFilters.push(filters.monitor("airnow"));
    if (mc.displayToggles.sjvair) monitorFilters.push(filters.sjvPurpleair(), filters.monitor("airgradient"));
    if (mc.displayToggles.inside) locationFilters.push(["==", ["get", "location"], "inside"]);
    if (mc.displayToggles.inactive) statusFilters.push(["==", ["get", "is_active"], false]);

    return ["all", monitorFilters, locationFilters, statusFilters];
  })
  accessor filters!: FilterSpecification;

  @Derived(() => {
    const mc = new MonitorsController();
    const levels = mc.meta.entryType(mc.pollutant).asIter.levels;

    return mc.latest.map(m => {
      const feature: MonitorMapFeature = {
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
  })
  accessor features!: Array<MonitorMapFeature>

  get mapLayer(): Parameters<MaptilerMap["addLayer"]> {
    return [{
      id: this.referenceId,
      type: "symbol",
      source: this.referenceId,
      filter: this.filters,
      layout: {
        "symbol-sort-key": ["get", "order"],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-image": ["get", "icon"],
        "icon-size": 1,
      },
      paint: {},
    }];
  }

  get mapSource(): Parameters<MaptilerMap["addSource"]> {
    return [this.referenceId, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: this.features
      }
    }];
  }
}
