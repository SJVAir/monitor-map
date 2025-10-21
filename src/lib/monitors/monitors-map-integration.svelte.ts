import { Popup, type ExpressionSpecification, type FilterSpecification, type Map as MaptilerMap } from "@maptiler/sdk";
import type { MonitorData, MonitorType } from "@sjvair/sdk";
import { Singleton } from "@tstk/decorators";
import { cast } from "@tstk/utils";
import type { Feature, Geometry } from "geojson";
import { MapGeoJSONIntegration } from "$lib/map/integrations.ts";
import type { TooltipPopup } from "$lib/map/integrations.ts";
import { Derived } from "$lib/reactivity.svelte.ts";
import { MonitorsController } from "./monitors.svelte.ts";
import { getIconId, MonitorsIconManager } from "./monitors-icon-manager.svelte.ts";
import type { MapController } from "$lib/map/map.svelte.ts";

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

  cursorPointer: boolean = true;

  icons: MonitorsIconManager = new MonitorsIconManager();

  tooltip: TooltipPopup = (mapCtrl) => (evt) => {
    if (!evt.features || !mapCtrl.map) return;

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
            <br/>
            is_sjvair: ${feature.properties.is_sjvair}
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
    console.log(levels)

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
      // NOTE: we keep the original single-source definition for backwards compatibility,
      // but we will create one clustered source per type in applyTo to avoid cross-type clustering.
      data: {
        type: "FeatureCollection",
        features: this.features
      }
    };
  }

  // Color map for type-based cluster circles (tweak to your styling)
  protected clusterColors: Record<string, string> = {
    purpleair: "#6A0DAD",
    airgradient: "#007ACC",
    bam1022: "#FF8C00",
    airnow: "#E53935",
    aqview: "#2E7D32",
    default: "#666666"
  };

  // Override applyTo to create one clustered source per type and add cluster layers.
  async applyTo(mc: MapController) {
    if (!mc.map) return;
    console.log(this.icons)

    // ensure icons are loaded
    await this.icons.loadIcons(mc.map);

    // group features by type
    const featuresByType = new Map<string, MonitorMapFeature[]>();
    for (const feat of this.features || []) {
      const t = feat.properties?.type ?? "unknown";
      const finalT = feat.properties?.is_sjvair ? "airgradient" : t;
      const arr = featuresByType.get(finalT) ?? [];
      arr.push(feat);
      featuresByType.set(finalT, arr);
    }

    // Add a clustered source + cluster/unclustered layers for each type
    for (const [type, feats] of featuresByType.entries()) {
      const sourceId = `${this.referenceId}-${type}`;

      // create source for this type (clustered)
      if (mc.map.getSource(sourceId)) {
        // if source exists, remove layers that may be present (simple refresh)
        // attempt best-effort cleanup. If previously added, remove the layers first.
        const existingLayers = [
          `${sourceId}-clusters`,
          `${sourceId}-cluster-count`,
          `${sourceId}-unclustered`,
          `${sourceId}-cluster-icon`
        ];
        for (const lid of existingLayers) {
          if (mc.map.getLayer(lid)) {
            try { mc.map.removeLayer(lid); } catch { /* ignore */ }
          }
        }
        try { mc.map.removeSource(sourceId); } catch { /* ignore */ }
      }

      mc.map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: feats
        },
        cluster: true,
        clusterRadius: 40,
        clusterMaxZoom: 9,
        // Aggregate properties for clusters so we can compute averages.
        // sumValues: the sum of numeric `properties.value` for features in the cluster
        // countValues: a simple count of features (sum of 1)
        clusterProperties: {
          sumValues: ["+", ["to-number", ["get", "value"]], 0],
          countValues: ["+", 1, 0]
        }
      });

      // cluster icon layer: use the averaged value in the cluster to pick an icon
      // compute average as sumValues / max(countValues, 1)
      const avgExpr = ["/", ["get", "sumValues"], ["max", ["get", "countValues"], 1]];

      // NOTE: The icon expression below maps averaged PM2.5 to icon ids.
      // Replace these icon ids with those produced by MonitorsIconManager (or
      // expose a helper on MonitorsIconManager that returns an expression or a mapping).
      // The thresholds chosen here are example PM2.5 breakpoints: 0-12,13-35,36-55,56-150,151+
      mc.map.addLayer({
        id: `${sourceId}-cluster-icon`,
        type: "symbol",
        source: sourceId,
        filter: ["has", "point_count"],
        layout: {
          // Choose an icon based on the computed average.
          // Replace icon names ("outside-default-square", "outside-yellow-square", ...) with ones you generate.
          "icon-image": [
            "case",
            ["<", avgExpr, 9.1], `outside-good-${getIconShape(type)}`,
            ["<", avgExpr, 35.5], `outside-moderate-${getIconShape(type)}`,
            ["<", avgExpr, 55.5], `outside-unhealthy_sensitive-${getIconShape(type)}`,
            ["<", avgExpr, 150.5], `outside-unhealthy-${getIconShape(type)}`,
            ["<", avgExpr, 250.5], `outside-very_unhealthy-${getIconShape(type)}`,
            [">", avgExpr, 250.4], `outside-hazardous-${getIconShape(type)}`,
            "outside-default-square"
          ],
          "icon-size": 1.5,
          "icon-ignore-placement": true,
          "icon-allow-overlap": true
        }
      }, this.beforeLayer);

      // cluster count label (show rounded average of properties.value within the cluster)
      mc.map.addLayer({
        id: `${sourceId}-cluster-count`,
        type: "symbol",
        source: sourceId,
        filter: ["has", "point_count"],
        layout: {
          // compute average = round(sumValues / countValues), fallback to point_count_abbreviated
          "text-field": [
            "case",
            [">", ["get", "countValues"], 0],
            //["concat",
            ["to-string",
              ["round",
                ["/", ["get", "sumValues"], ["max", ["get", "countValues"], 1]]
              ]
            ],
            //  " PM2.5"
            //],
            ["to-string", ["get", "point_count_abbreviated"]]
          ],
          "text-size": 12,
          "text-ignore-placement": true,
          "text-allow-overlap": true
        },
        paint: {
          "text-color": [
            "case",
            ["<", avgExpr, 250.5], "#000000",
            "#FFFFFF",
          ]
        }
      }, this.beforeLayer);

      // unclustered points for this type
      // apply the global filters and ensure we only show non-clustered points
      const unclusteredFilter: any = ["all", this.filters || ["all"], ["!", ["has", "point_count"]]];

      mc.map.addLayer({
        id: `${sourceId}-unclustered`,
        type: "symbol",
        source: sourceId,
        filter: unclusteredFilter,
        layout: {
          "symbol-sort-key": ["get", "order"],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-image": ["get", "icon"],
          "icon-size": 1
        },
        paint: {}
      }, this.beforeLayer);

      // cursor + tooltip handlers for unclustered points of this type
      if (this.cursorPointer) {
        mc.map.on("mousemove", `${sourceId}-unclustered`, () => {
          mc.map!.getCanvas().style.cursor = "pointer";
        });
        mc.map.on("mouseleave", `${sourceId}-unclustered`, () => {
          mc.map!.getCanvas().style.cursor = "";
        });
      }
      if (this.tooltip) {
        const tooltip = this.tooltip(mc);
        mc.map.on("mousemove", `${sourceId}-unclustered`, tooltip);
        mc.map.on("mouseleave", `${sourceId}-unclustered`, () => {
          if (mc.tooltipPopup) mc.tooltipPopup.remove();
          mc.tooltipPopup = null;
        });
      }
    }

    // set visibility according to enabled flag (for the first source/layer group)
    // we toggle visibility on each cluster layer created above
    for (const [type] of featuresByType.entries()) {
      const clusterIconLayerId = `${this.referenceId}-${type}-cluster-icon`;
      const unclusteredLayerId = `${this.referenceId}-${type}-unclustered`;
      const countLayerId = `${this.referenceId}-${type}-cluster-count`;
      try {
        const isVisible = mc.map.getLayoutProperty(clusterIconLayerId, "visibility");
        const desired = this.enabled ? "visible" : "none";
        if (!isVisible || isVisible !== desired) {
          mc.map.setLayoutProperty(clusterIconLayerId, "visibility", desired);
        }
        if (!isVisible || mc.map.getLayer(unclusteredLayerId)) {
          mc.map.setLayoutProperty(unclusteredLayerId, "visibility", desired);
        }
        if (!isVisible || mc.map.getLayer(countLayerId)) {
          mc.map.setLayoutProperty(countLayerId, "visibility", desired);
        }
      } catch {
        // ignore missing layers
      }
    }
  }
}
