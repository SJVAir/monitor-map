import {
	type ExpressionSpecification,
	type FilterSpecification,
	type Map as MaptilerMap
} from "@maptiler/sdk";
import type { MonitorType, SJVAirEntryLevel } from "@sjvair/sdk";
import { untrack } from "svelte";
import type { Geometry } from "geojson";
import { mapManager } from "$lib/map/map.svelte.ts";
import { clickManager, type ClickHandler } from "$lib/map/integrations/click-manager.ts";
import { MapGeoJSONIntegration } from "$lib/map/integrations/map-geojson-integration.svelte.ts";
import { monitorsManager } from "./monitors.svelte.ts";
import { getIconId, MonitorsIconManager } from "./monitors-icon-manager.svelte.ts";
import { TooltipManager } from "$lib/map/integrations/tooltip.svelte.ts";
import { MapDisplayOption } from "$lib/map/integrations/map-display-option.svelte.ts";
import { getCurrentLevel, getOrder } from "./monitor-utils.ts";
import { MonitorsClusterRenderer, monitorTooltip } from "./monitors-cluster-renderer.ts";
import type { MonitorMapFeature, MonitorMarkerProperties } from "./types.ts";

const filters = {
	monitor(deviceType: MonitorType): ExpressionSpecification {
		return ["==", ["get", "type"], deviceType];
	},
	purpleair(): ExpressionSpecification {
		return ["all", ["==", ["get", "type"], "purpleair"], ["==", ["get", "is_sjvair"], false]];
	},
	sjvPurpleair(): ExpressionSpecification {
		return ["all", ["==", ["get", "type"], "purpleair"], ["==", ["get", "is_sjvair"], true]];
	}
};

class MonitorsMapIntegration extends MapGeoJSONIntegration<MonitorMarkerProperties> {
	referenceId: string = "monitors";
	enabled: boolean = $state(true);
	clustered: boolean = $state(true);

	icons: MonitorsIconManager = new MonitorsIconManager();
	tooltipManager: TooltipManager = new TooltipManager();
	private renderer: MonitorsClusterRenderer = new MonitorsClusterRenderer(this);

	displayOptions = {
		purpleair: new MapDisplayOption("PurpleAir", true),
		sjvair: new MapDisplayOption("SJVAir non-FEM", true),
		aqview: new MapDisplayOption("AQview", true),
		bam1022: new MapDisplayOption("SJVAir FEM", true),
		airnow: new MapDisplayOption("AirNow", true),
		inactive: new MapDisplayOption("Inactive", false),
		inside: new MapDisplayOption("Inside", false)
	};

	/** Set by the app to handle navigation when a monitor is clicked. Receives the monitor ID. */
	onMonitorClick: ((id: string) => void) | null = null;
	selectedMonitorId: string | null = $state(null);

	private handleMonitorClick: ClickHandler = (features) => {
		if (!this.onMonitorClick) return;
		const sorted = [...features].sort(
			(a, b) => (b.properties?.order ?? 0) - (a.properties?.order ?? 0)
		);
		const top = sorted[0];
		if (!top?.properties?.id) return;
		this.selectedMonitorId = top.properties.id as string;
		this.onMonitorClick(this.selectedMonitorId);
		if (top.geometry.type !== "Point") return;
		const coords = top.geometry.coordinates as [number, number];
		mapManager.map?.easeTo({
			center: coords,
			zoom: Math.max(mapManager.map.getZoom(), 12)
		});
	};

	features: Array<MonitorMapFeature> = $derived.by(() => {
		if (!monitorsManager.meta || !monitorsManager.latest || !monitorsManager.pollutant) {
			return [];
		}
		const levels = monitorsManager.meta.entryType(monitorsManager.pollutant).asIter.levels;

		return Array.from(
			monitorsManager.latest.values().map((m) => {
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
						value: m.latest.value
					},
					geometry: m.position! as Geometry
				};

				if (levels) {
					const level = getCurrentLevel(m.latest.value, levels);
					if (level) {
						feature.properties.icon = getIconId(m, level);
					}
				}

				return feature;
			})
		);
	});

	filters: FilterSpecification = $derived.by((): FilterSpecification => {
		const monitorFilters: ExpressionSpecification = ["any"];
		const locationFilters: ExpressionSpecification = [
			"any",
			["==", ["get", "location"], "outside"]
		];
		const statusFilters: ExpressionSpecification = ["any", ["==", ["get", "is_active"], true]];

		if (this.displayOptions.purpleair.value) monitorFilters.push(filters.purpleair());
		if (this.displayOptions.aqview.value) monitorFilters.push(filters.monitor("aqview"));
		if (this.displayOptions.bam1022.value) monitorFilters.push(filters.monitor("bam1022"));
		if (this.displayOptions.airnow.value) monitorFilters.push(filters.monitor("airnow"));
		if (this.displayOptions.sjvair.value)
			monitorFilters.push(filters.sjvPurpleair(), filters.monitor("airgradient"));
		if (this.displayOptions.inside.value)
			locationFilters.push(["==", ["get", "location"], "inside"]);
		if (this.displayOptions.inactive.value) statusFilters.push(["==", ["get", "is_active"], false]);

		return ["all", monitorFilters, locationFilters, statusFilters];
	});

	// Groups features by monitor type for per-type cluster sources, applying display option
	// filters so cluster aggregates only include visible monitors. sjvair purpleair is remapped
	// to "airgradient" since they share the same shape (circle).
	featuresByType: Record<string, MonitorMapFeature[]> = $derived.by(() => {
		const opts = this.displayOptions;
		const byType: Record<string, MonitorMapFeature[]> = {};

		for (const feat of this.features) {
			const p = feat.properties;

			if (!p.is_active && !opts.inactive.value) continue;
			if (p.location === "inside" && !opts.inside.value) continue;

			const typeVisible: Partial<Record<MonitorType, boolean>> = {
				purpleair: p.is_sjvair ? opts.sjvair.value : opts.purpleair.value,
				airgradient: opts.sjvair.value,
				aqview: opts.aqview.value,
				bam1022: opts.bam1022.value,
				airnow: opts.airnow.value
			};
			if (!(typeVisible[p.type] ?? true)) continue;

			const key = p.type === "purpleair" && p.is_sjvair ? "airgradient" : p.type;
			const arr = byType[key] ?? [];
			arr.push(feat);
			byType[key] = arr;
		}
		return byType;
	});

	clusterIconThresholds: Array<SJVAirEntryLevel> = $derived.by(() => {
		if (!monitorsManager.meta || !monitorsManager.pollutant) return [];
		return monitorsManager.meta.entryType(monitorsManager.pollutant).asIter.levels ?? [];
	});

	get mapLayer(): Parameters<MaptilerMap["addLayer"]>[0] {
		return {
			id: this.referenceId,
			type: "symbol",
			source: this.referenceId,
			filter: this.filters,
			layout: {
				"symbol-sort-key": ["coalesce", ["get", "order"], 0],
				"icon-allow-overlap": true,
				"icon-ignore-placement": true,
				"icon-image": ["get", "icon"],
				"icon-size": 1
			},
			paint: {}
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

	constructor() {
		super();

		$effect.root(() => {
			// Push filter changes to the active layer(s) imperatively
			$effect(() => {
				const filter = this.filters;
				if (!mapManager.map) return;

				if (this.clustered) {
					this.renderer.syncFilter();
				} else {
					if (mapManager.map.getLayer(this.referenceId)) {
						mapManager.map.setFilter(this.referenceId, filter);
					}
				}
			});

			// Sync unclustered source data when features change
			$effect(() => {
				const features = this.features;
				if (!mapManager.map || this.clustered) return;
				mapManager.setDataSource(this.referenceId, features);
			});

			// Keep cluster source data in sync when features or display options change
			$effect(() => {
				void this.featuresByType;
				if (!mapManager.map || !this.clustered) return;
				this.renderer.syncFeatures();
			});

			// Push updated icon expressions to cluster layers when the pollutant changes
			$effect(() => {
				const thresholds = this.clusterIconThresholds;
				if (!mapManager.map || !this.clustered || !thresholds.length) return;
				this.renderer.syncThresholds();
			});

			// Re-apply when clustered mode switches or when data first arrives (cold load).
			// featuresByType is tracked so this fires once data is available; untrack on apply()
			// prevents reactive reads inside it from leaking into this effect's dependency graph.
			$effect(() => {
				void this.clustered;
				const hasFeatures = Object.keys(this.featuresByType).length > 0;
				if (!untrack(() => mapManager.map) || !hasFeatures) return;
				untrack(() => this.apply());
			});

			// Sync selected icon scale via feature state
			$effect(() => {
				void this.selectedMonitorId;
				if (!mapManager.map) return;
				untrack(() => this.applySelectedState());
			});
		});
	}

	apply() {
		if (!mapManager.map) return;

		if (!this.tooltipManager.has(this.referenceId)) {
			this.tooltipManager.register(this.referenceId, monitorTooltip);
		}

		if (this.clustered) {
			if (mapManager.map.getLayer(this.referenceId)) mapManager.map.removeLayer(this.referenceId);
			if (mapManager.map.getSource(this.referenceId)) mapManager.map.removeSource(this.referenceId);
			clickManager.unregister([this.referenceId]);
			this.tooltipManager.disable();
			this.renderer.remove();
			this.icons.loadIcons().then(() => {
				this.renderer.apply(this.handleMonitorClick);
				this.tooltipManager.enable();
				this.applySelectedState();
			});
		} else {
			this.tooltipManager.disable();
			this.renderer.remove();
			this.tooltipManager.enable();
			clickManager.unregister([this.referenceId]);
			super.apply();
			this.icons.loadIcons().then(() => {
				clickManager.register([this.referenceId], this.handleMonitorClick);
				this.applySelectedState();
			});
		}
	}

	remove() {
		clickManager.unregister([this.referenceId]);
		this.renderer.remove();
		super.remove();
	}

	private applySelectedState(): void {
		if (!mapManager.map) return;
		const layerIds = this.clustered ? this.renderer.unclusteredLayerIds : [this.referenceId];
		const iconSize = this.selectedMonitorId
			? (["match", ["get", "id"], this.selectedMonitorId, 1.3, 1] as ExpressionSpecification)
			: 1;
		for (const layerId of layerIds) {
			if (!mapManager.map.getLayer(layerId)) continue;
			mapManager.map.setLayoutProperty(layerId, "icon-size", iconSize);
		}
	}
}

export const monitorsMapIntegration = new MonitorsMapIntegration();
export type { MonitorsMapIntegration };
