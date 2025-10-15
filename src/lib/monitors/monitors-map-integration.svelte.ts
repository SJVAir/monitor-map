import { Popup, type ExpressionSpecification, type FilterSpecification, type Map as MaptilerMap } from "@maptiler/sdk";
import type { MonitorData, MonitorType } from "@sjvair/sdk";
import { Singleton } from "@tstk/decorators";
import { cast } from "@tstk/utils";
import type { Feature, Geometry } from "geojson";
import { MapGeoJSONIntegration } from "$lib/map/integrations.ts";
import { Derived } from "$lib/reactivity.svelte.ts";
import type { TooltipPopup } from "$lib/map/types.ts";
import { MonitorsController } from "./monitors.svelte.ts";
import { getIconId, MonitorsIconManager } from "./monitors-icon-manager.svelte.ts";

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
export class MonitorsMapIntegration extends MapGeoJSONIntegration<MonitorMarkerProperties> {
  referenceId: string = "monitors";

  enabled: boolean = true;

  icons: MonitorsIconManager = new MonitorsIconManager();

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
          feature.properties.icon = getIconId(m, level);
        }
      }

      return feature;
    });
  })
  accessor features!: Array<MonitorMapFeature>

  get mapLayer(): Parameters<MaptilerMap["addLayer"]>[0] {
    return {
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
    };
  }

  get mapSource(): Parameters<MaptilerMap["addSource"]>[1] {
    return {
      type: "geojson",
      //cluster: true,
      //clusterRadius: 25,
      //clusterMaxZoom: 9,
      //clusterMinPoints: 2,
      //clusterProperties: {
      //  "sum": ["+", ["get", "order"]]
      //},
      data: {
        type: "FeatureCollection",
        features: this.features
      }
    };
  }
}
