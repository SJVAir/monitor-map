import {
	Popup,
	type ExpressionSpecification,
	type FilterSpecification,
	type MapLayerEventType,
	type Map as MaptilerMap
} from "@maptiler/sdk";
import type { MonitorType, SJVAirEntryLevel } from "@sjvair/sdk";
import { untrack } from "svelte";
import type { Geometry } from "geojson";
import { mapManager } from "$lib/map/map.svelte.ts";
import { MapGeoJSONIntegration } from "$lib/map/integrations/map-geojson-integration.svelte.ts";
import { mountPopup } from "$lib/map/utils.ts";
import { monitorsManager } from "./monitors.svelte.ts";
import { getIconId, MonitorsIconManager } from "./monitors-icon-manager.svelte.ts";
import { TooltipManager } from "$lib/map/integrations/tooltip.svelte.ts";
import { MapDisplayOption } from "$lib/map/integrations/map-display-option.svelte.ts";
import { getCurrentLevel, getOrder, getTypeShape } from "./monitor-utils.ts";
import MonitorTooltip from "./MonitorTooltip.svelte";
import MonitorClusterTooltip from "./MonitorClusterTooltip.svelte";
import type {
	MonitorClusterMapFeature,
	MonitorMapFeature,
	MonitorMarkerProperties
} from "./types.ts";

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

const AVG_EXPR: ExpressionSpecification = [
	"/",
	["get", "sumValues"],
	["max", ["get", "point_count"], 1]
];

function clusterTooltip(evt: MapLayerEventType["mousemove"] & object): Popup | void {
	const feature = evt.features?.[0] as unknown as MonitorClusterMapFeature | undefined;
	if (!feature) return;
	return mountPopup(MonitorClusterTooltip, { feature }, evt.lngLat);
}

function monitorTooltip(evt: MapLayerEventType["mousemove"] & object): Popup | void {
	const features = evt.features as unknown as Array<MonitorMapFeature> | undefined;
	const feature = features?.sort((a, b) => b.properties.order - a.properties.order)[0];
	if (!feature) return;
	return mountPopup(MonitorTooltip, { feature }, evt.lngLat);
}

class MonitorsMapIntegration extends MapGeoJSONIntegration<MonitorMarkerProperties> {
	referenceId: string = "monitors";
	enabled: boolean = $state(true);
	clustered: boolean = $state(true);

	icons: MonitorsIconManager = new MonitorsIconManager();
	tooltipManager: TooltipManager = new TooltipManager();

	private _clusterTypes: string[] = [];

	displayOptions = {
		purpleair: new MapDisplayOption("PurpleAir", true),
		sjvair: new MapDisplayOption("SJVAir non-FEM", true),
		aqview: new MapDisplayOption("AQview", true),
		bam1022: new MapDisplayOption("SJVAir FEM", true),
		airnow: new MapDisplayOption("AirNow", true),
		inactive: new MapDisplayOption("Inactive", false),
		inside: new MapDisplayOption("Inside", false)
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
					for (const type of this._clusterTypes) {
						const sourceId = `${this.referenceId}-${type}`;
						const { unclustered } = this.clusterLayerIds(sourceId);
						if (mapManager.map.getLayer(unclustered)) {
							mapManager.map.setFilter(unclustered, [
								"all",
								filter as ExpressionSpecification,
								["!", ["has", "point_count"]]
							]);
						}
					}
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
				const featuresByType = this.featuresByType;
				if (!mapManager.map || !this.clustered) return;

				for (const type of this._clusterTypes) {
					const sourceId = `${this.referenceId}-${type}`;
					mapManager.setDataSource(sourceId, featuresByType[type] ?? []);
				}
			});

			// Push updated icon expressions to cluster layers when the pollutant changes
			$effect(() => {
				const thresholds = this.clusterIconThresholds;
				if (!mapManager.map || !this.clustered || !thresholds.length) return;

				for (const type of this._clusterTypes) {
					const sourceId = `${this.referenceId}-${type}`;
					const { icon, average } = this.clusterLayerIds(sourceId);

					if (mapManager.map.getLayer(icon)) {
						mapManager.map.setLayoutProperty(
							icon,
							"icon-image",
							this.buildClusterIconExpression(AVG_EXPR, getTypeShape(type))
						);
					}
					if (mapManager.map.getLayer(average)) {
						mapManager.map.setPaintProperty(average, "text-color", [
							"case",
							["<=", AVG_EXPR, this.clusterTextColorThreshold],
							"#000000",
							"#FFFFFF"
						]);
					}
				}
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
			this.tooltipManager.disable();
			this.removeClusters();
			this.icons.loadIcons().then(() => {
				this.applyClusters();
				this.tooltipManager.enable();
			});
		} else {
			this.tooltipManager.disable();
			this.removeClusters();
			this.tooltipManager.enable();
			super.apply();
		}
	}

	remove() {
		this.removeClusters();
		super.remove();
	}

	private applyClusters() {
		if (!mapManager.map) return;

		const sortedEntries = Object.entries(this.featuresByType).sort(([, a], [, b]) => {
			const maxOrder = (fs: MonitorMapFeature[]) =>
				fs.reduce((m, f) => Math.max(m, f.properties.order), 0);
			return maxOrder(a) - maxOrder(b);
		});

		for (const [[type, features], index] of sortedEntries.map((e, i) => [e, i] as const)) {
			const sourceId = `${this.referenceId}-${type}`;

			mapManager.map.addSource(sourceId, {
				type: "geojson",
				promoteId: "id",
				data: { type: "FeatureCollection", features },
				cluster: true,
				clusterRadius: 40,
				clusterMaxZoom: 9,
				clusterProperties: {
					sumValues: ["+", ["to-number", ["get", "value"]], 0]
					//countValues: ["+", 1, 0]
				}
			});

			this.monitorTypeIconsLayer(sourceId, AVG_EXPR, getTypeShape(type));
			this.clusterCountLayer(sourceId, AVG_EXPR);
			this.unclusteredLayer(sourceId);

			const { icon, unclustered } = this.clusterLayerIds(sourceId);

			if (!this.tooltipManager.has(icon)) {
				this.tooltipManager.register(icon, clusterTooltip, index);
			}
			if (!this.tooltipManager.has(unclustered)) {
				this.tooltipManager.register(unclustered, monitorTooltip, index);
			}

			this._clusterTypes.push(type);
		}
	}

	private removeClusters() {
		if (!mapManager.map) return;

		for (const type of this._clusterTypes) {
			const sourceId = `${this.referenceId}-${type}`;
			const layers = this.clusterLayerIds(sourceId);
			for (const layerId of Object.values(layers)) {
				if (mapManager.map.getLayer(layerId)) {
					mapManager.map.removeLayer(layerId);
				}
			}
			if (mapManager.map.getSource(sourceId)) {
				mapManager.map.removeSource(sourceId);
			}
		}

		this._clusterTypes = [];
	}

	private get clusterTextColorThreshold(): number {
		// Use the max of the 3rd level (unhealthy_sensitive) so text flips to white at unhealthy+
		return this.clusterIconThresholds[2]?.range[1] ?? 150.5;
	}

	private clusterLayerIds(sourceId: string): { icon: string; average: string; unclustered: string } {
		return {
			icon: `${sourceId}-cluster-icon`,
			average: `${sourceId}-cluster-average`,
			unclustered: `${sourceId}-unclustered`
		};
	}

	private buildClusterIconExpression(
		avgExpr: ExpressionSpecification,
		shape: string
	): ExpressionSpecification {
		const thresholds = this.clusterIconThresholds;
		if (!thresholds.length) return `outside-default-${shape}` as unknown as ExpressionSpecification;

		const expr: unknown[] = ["case"];
		for (const level of thresholds.slice(0, -1)) {
			expr.push(["<=", avgExpr, level.range[1]], `outside-${level.name}-${shape}`);
		}
		expr.push(`outside-${thresholds.at(-1)!.name}-${shape}`);
		return expr as ExpressionSpecification;
	}

	private monitorTypeIconsLayer(sourceId: string, avgExpr: ExpressionSpecification, shape: string) {
		const { icon } = this.clusterLayerIds(sourceId);
		mapManager.map?.addLayer(
			{
				id: icon,
				type: "symbol",
				source: sourceId,
				filter: ["has", "point_count"],
				layout: {
					"icon-image": this.buildClusterIconExpression(avgExpr, shape),
					"icon-size": ["step", ["get", "point_count"], 1.3, 10, 1.6, 25, 2.0],
					"icon-ignore-placement": true,
					"icon-allow-overlap": true
				},
				paint: {
					"icon-opacity": 0.8
				}
			},
			this.beforeLayer
		);
	}

	private clusterCountLayer(sourceId: string, avgExpr: ExpressionSpecification) {
		const { average } = this.clusterLayerIds(sourceId);
		mapManager.map?.addLayer(
			{
				id: average,
				type: "symbol",
				source: sourceId,
				filter: ["has", "point_count"],
				layout: {
					"text-field": ["to-string", ["round", avgExpr]],
					"text-size": 12,
					"text-ignore-placement": true,
					"text-allow-overlap": true
				},
				paint: {
					"text-color": [
						"case",
						["<=", avgExpr, this.clusterTextColorThreshold],
						"#000000",
						"#FFFFFF"
					]
				}
			},
			this.beforeLayer
		);
	}

	private unclusteredLayer(sourceId: string) {
		const { unclustered } = this.clusterLayerIds(sourceId);
		mapManager.map?.addLayer(
			{
				id: unclustered,
				type: "symbol",
				source: sourceId,
				filter: ["all", this.filters as ExpressionSpecification, ["!", ["has", "point_count"]]],
				layout: {
					"symbol-sort-key": ["coalesce", ["get", "order"], 0],
					"icon-allow-overlap": true,
					"icon-ignore-placement": true,
					"icon-image": ["get", "icon"],
					"icon-size": 1
				},
				paint: {}
			},
			this.beforeLayer
		);
	}
}

export const monitorsMapIntegration = new MonitorsMapIntegration();
export type { MonitorsMapIntegration };
