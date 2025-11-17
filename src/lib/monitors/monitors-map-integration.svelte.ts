import { Popup, type ExpressionSpecification, type FilterSpecification, type MapLayerEventType, type Map as MaptilerMap } from "@maptiler/sdk";
import type { MonitorData, MonitorType } from "@sjvair/sdk";
import { Singleton } from "@tstk/decorators";
import { cast } from "@tstk/utils";
import type { Feature, Geometry } from "geojson";
import { MapGeoJSONIntegration } from "$lib/map/integrations/map-geojson-integration.svelte.ts";
import { Derived, Reactive } from "$lib/reactivity.svelte.ts";
import { MonitorsController } from "./monitors.svelte.ts";
import { getIconId, MonitorsIconManager } from "./monitors-icon-manager.svelte.ts";
import { TooltipManager } from "$lib/map/integrations/tooltip.svelte.ts";
import { MonitorsDisplayOptions } from "./monitors-display-options.svelte.ts";

export type MonitorMapFeature = Feature<Geometry, MonitorMarkerProperties>;

export interface MonitorMarkerProperties {
  icon: string;
  id: string;
  is_active: boolean;
  is_sjvair?: boolean;
  location: string;
  name: string;
  order: number;
  type: MonitorType;
  value: string;
}

export function getIconShape(monitorType: string): string {

  switch (monitorType) {
    case "airgradient":
      return "circle";

    case "airnow":
    case "aqview":
    case "bam1022":
      return "triangle";

    case "purpleair":
      return "square";

    default:
      throw new Error(`Icon shape for ${monitorType} has not been set`);
  }
}

function getOrder(monitor: MonitorData): number {
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

function monitorTooltip(evt: MapLayerEventType["mousemove"] & Object): Popup | void {

  const feature = cast<MonitorMapFeature, Array<MonitorMapFeature>>(
    evt.features,
    features => {
      features.sort((a, b) => b.properties.order - a.properties.order);
      return features[0];
    }
  );

  if (feature) {
    return new Popup({ closeButton: false, closeOnClick: false })
      .setLngLat(evt.lngLat)
      .setHTML(`
        <div>
          <strong>${feature.properties.name}</strong>
          <br/>
          Value: ${feature.properties.value}PM2.5
          <br/>
          location: ${feature.properties.location}
          <br/>
          is_sjvair: ${feature.properties.is_sjvair}
        </div>`
      );
  }
};

@Singleton
export class MonitorsMapIntegration extends MapGeoJSONIntegration<MonitorMarkerProperties> {

  referenceId: string = "monitors";

  enabled: boolean = true;

  icons: MonitorsIconManager = new MonitorsIconManager();

  tooltipManager = new TooltipManager();

  @Derived(() => {
    const mc = new MonitorsController();
    const levels = mc.meta.entryType(mc.pollutant).asIter.levels;

    return Array.from(mc.latest.values()
      .map(m => {
        const feature: MonitorMapFeature = {
          type: "Feature",
          properties: {
            icon: "outside-default-square",
            id: m.id,
            is_active: m.is_active,
            is_sjvair: m.is_sjvair,
            location: m.location,
            name: m.name,
            order: getOrder(m),
            type: m.type,
            value: m.latest.value,
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
      }));
  })
  accessor diff!: any;

  @Derived((): FilterSpecification => {
    console.log("updating filters")
    const display = new MonitorsDisplayOptions();
    const monitorFilters: ExpressionSpecification = ["any"];
    const locationFilters: ExpressionSpecification = ["any", ["==", ["get", "location"], "outside"]];
    const statusFilters: ExpressionSpecification = ["any", ["==", ["get", "is_active"], true]];

    for (const option of Object.values(display.options)) {
      console.log(`${option.label}: ${option.value}`);
    }
    if (display.options.purpleair.value) monitorFilters.push(filters.purpleair());
    if (display.options.aqview.value) monitorFilters.push(filters.monitor("aqview"));
    if (display.options.bam1022.value) monitorFilters.push(filters.monitor("bam1022"));
    if (display.options.airnow.value) monitorFilters.push(filters.monitor("airnow"));
    if (display.options.sjvair.value) monitorFilters.push(filters.sjvPurpleair(), filters.monitor("airgradient"));
    if (display.options.inside.value) locationFilters.push(["==", ["get", "location"], "inside"]);
    if (display.options.inactive.value) statusFilters.push(["==", ["get", "is_active"], false]);

    //if (display.otherOptions.find(o => o.label === "PurpleAir")?.value) monitorFilters.push(filters.purpleair());
    //if (display.otherOptions.find(o => o.label === "AQview")?.value) monitorFilters.push(filters.monitor("aqview"));
    //if (display.otherOptions.find(o => o.label === "SJVAir FEM")?.value) monitorFilters.push(filters.monitor("bam1022"));
    //if (display.otherOptions.find(o => o.label === "AirNow")?.value) monitorFilters.push(filters.monitor("airnow"));
    //if (display.otherOptions.find(o => o.label === "SJVAir non-FEM")?.value) monitorFilters.push(filters.sjvPurpleair(), filters.monitor("airgradient"));
    //if (display.otherOptions.find(o => o.label === "Inside")?.value) locationFilters.push(["==", ["get", "location"], "inside"]);
    //if (display.otherOptions.find(o => o.label === "Inactive")?.value) statusFilters.push(["==", ["get", "is_active"], false]);

    return ["all", monitorFilters, locationFilters, statusFilters];
  })
  accessor filters!: FilterSpecification;

  @Derived(() => {
    console.log("updating monitor features")
    const mc = new MonitorsController();
    const levels = mc.meta.entryType(mc.pollutant).asIter.levels;

    return Array.from(mc.latest.values()
      .map(m => {
        const feature: MonitorMapFeature = {
          type: "Feature",
          properties: {
            icon: "outside-default-square",
            id: m.id,
            is_active: m.is_active,
            is_sjvair: m.is_sjvair,
            location: m.location,
            name: m.name,
            order: getOrder(m),
            type: m.type,
            value: m.latest.value,
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
      }));
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
      promoteId: "id",
      data: {
        type: "FeatureCollection",
        features: this.features
      }
    };
  }

  // Override applyTo to create one clustered source per type and add cluster layers.
  apply() {
    if (!MonitorsMapIntegration.mapCtrl.map) return;

    if (!this.tooltipManager.has(this.referenceId)) {
      this.tooltipManager.register(this.referenceId, monitorTooltip);
    }

    this.tooltipManager.enable();

    super.apply();
  }
}
