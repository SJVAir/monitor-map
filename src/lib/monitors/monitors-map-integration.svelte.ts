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

    // ensure icons are loaded
    await this.icons.loadIcons(mc.map);

    // group features by type
    const featuresByType = new Map<string, MonitorMapFeature[]>();
    for (const feat of this.features || []) {
      const t = feat.properties?.type ?? "unknown";
      const arr = featuresByType.get(t) ?? [];
      arr.push(feat);
      featuresByType.set(t, arr);
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
          `${sourceId}-unclustered`
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
        clusterMaxZoom: 9
      });

      // cluster circles
      mc.map.addLayer({
        id: `${sourceId}-clusters`,
        type: "circle",
        source: sourceId,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": this.clusterColors[type] ?? this.clusterColors.default,
          "circle-radius": [
            "step",
            ["get", "point_count"],
            15, 10,
            20, 25,
            25
          ],
          "circle-opacity": 0.8,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff"
        }
      }, this.beforeLayer);

      // cluster count label
      mc.map.addLayer({
        id: `${sourceId}-cluster-count`,
        type: "symbol",
        source: sourceId,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
          "text-ignore-placement": true,
          "text-allow-overlap": true
        },
        paint: {
          "text-color": "#ffffff"
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
      const clusterLayerId = `${this.referenceId}-${type}-clusters`;
      const unclusteredLayerId = `${this.referenceId}-${type}-unclustered`;
      const countLayerId = `${this.referenceId}-${type}-cluster-count`;
      try {
        const isVisible = mc.map.getLayoutProperty(clusterLayerId, "visibility");
        const desired = this.enabled ? "visible" : "none";
        if (!isVisible || isVisible !== desired) {
          mc.map.setLayoutProperty(clusterLayerId, "visibility", desired);
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
