import {
	Popup,
	type ExpressionSpecification,
	type FilterSpecification,
	type MapLayerEventType,
	type Map as MaptilerMap
} from "@maptiler/sdk";
import type { MonitorType } from "@sjvair/sdk";
import { cast } from "@tstk/utils";
import { untrack } from "svelte";
import type { Feature, Geometry } from "geojson";
import { mapManager } from "$lib/map/map.svelte.ts";
import { MapGeoJSONIntegration } from "$lib/map/integrations/map-geojson-integration.svelte.ts";
import { monitorsManager } from "./monitors.svelte.ts";
import { getIconId, MonitorsIconManager } from "./monitors-icon-manager.svelte.ts";
import { TooltipManager } from "$lib/map/integrations/tooltip.svelte.ts";
import { getOrder, getTypeShape } from "./monitor-utils.ts";

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

function monitorTooltip(evt: MapLayerEventType["mousemove"] & object): Popup | void {
	const feature = cast<MonitorMapFeature, Array<MonitorMapFeature>>(evt.features, (features) => {
		features.sort((a, b) => b.properties.order - a.properties.order);
		return features[0];
	});

	if (feature) {
		return new Popup({ closeButton: false, closeOnClick: false }).setLngLat(evt.lngLat).setHTML(`
        <div>
          <strong>${feature.properties.name}</strong>
          <br/>
          Value: ${feature.properties.value}PM2.5
          <br/>
          location: ${feature.properties.location}
          <br/>
          is_sjvair: ${feature.properties.is_sjvair}
        </div>`);
	}
}

class MapDisplayOption {
	label: string;
	value: boolean;

	constructor(label: string, value: boolean) {
		this.label = label;
		this.value = $state(value);
	}
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
					const level = levels.find((lvl) => {
						const value = parseInt(m.latest.value, 10);
						return value >= lvl.range[0] && value <= lvl.range[1];
					});

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
	featuresByType: Map<string, MonitorMapFeature[]> = $derived.by(() => {
		const opts = this.displayOptions;
		const byType = new Map<string, MonitorMapFeature[]>();

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
			const arr = byType.get(key) ?? [];
			arr.push(feat);
			byType.set(key, arr);
		}
		return byType;
	});

	mapLayer: Parameters<MaptilerMap["addLayer"]>[0] = {
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
						const layerId = `${this.referenceId}-${type}-unclustered`;
						if (mapManager.map.getLayer(layerId)) {
							mapManager.map.setFilter(layerId, [
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
					mapManager.setDataSource(`${this.referenceId}-${type}`, featuresByType.get(type) ?? []);
				}
			});

			// Re-apply when clustered mode switches. mapManager.map is untracked because the
			// base class already owns the map-load lifecycle. untrack on apply() prevents
			// reactive reads inside it from leaking into this effect's dependency graph.
			$effect(() => {
				const clustered = this.clustered;
				if (!untrack(() => mapManager.map)) return;
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
			this.removeClusters();
			this.icons.loadIcons().then(() => {
				this.applyClusters();
				this.tooltipManager.disable();
			});
		} else {
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

		const sortedEntries = [...this.featuresByType.entries()].sort(([, a], [, b]) => {
			const maxOrder = (fs: MonitorMapFeature[]) =>
				fs.reduce((m, f) => Math.max(m, f.properties.order), 0);
			return maxOrder(a) - maxOrder(b);
		});

		for (const [type, features] of sortedEntries) {
			const sourceId = `${this.referenceId}-${type}`;
			const avgExpr: ExpressionSpecification = [
				"/",
				["get", "sumValues"],
				["max", ["get", "countValues"], 1]
			];

			mapManager.map.addSource(sourceId, {
				type: "geojson",
				data: { type: "FeatureCollection", features },
				cluster: true,
				clusterRadius: 40,
				clusterMaxZoom: 9,
				clusterProperties: {
					sumValues: ["+", ["to-number", ["get", "value"]], 0],
					countValues: ["+", 1, 0]
				}
			});

			this.monitorTypeIconsLayer(sourceId, avgExpr, getTypeShape(type));
			this.clusterCountLayer(sourceId, avgExpr);
			this.unclusteredLayer(sourceId);

			this._clusterTypes.push(type);
		}
	}

	private removeClusters() {
		if (!mapManager.map) return;

		for (const type of this._clusterTypes) {
			const sourceId = `${this.referenceId}-${type}`;
			for (const layerId of [
				`${sourceId}-cluster-icon`,
				`${sourceId}-cluster-count`,
				`${sourceId}-unclustered`
			]) {
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

	private monitorTypeIconsLayer(sourceId: string, avgExpr: ExpressionSpecification, shape: string) {
		mapManager.map?.addLayer(
			{
				id: `${sourceId}-cluster-icon`,
				type: "symbol",
				source: sourceId,
				filter: ["has", "point_count"],
				layout: {
					"icon-image": [
						"case",
						["<", avgExpr, 9.1],
						`outside-good-${shape}`,
						["<", avgExpr, 35.5],
						`outside-moderate-${shape}`,
						["<", avgExpr, 55.5],
						`outside-unhealthy_sensitive-${shape}`,
						["<", avgExpr, 150.5],
						`outside-unhealthy-${shape}`,
						["<", avgExpr, 250.5],
						`outside-very_unhealthy-${shape}`,
						`outside-hazardous-${shape}`
					],
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
		mapManager.map?.addLayer(
			{
				id: `${sourceId}-cluster-count`,
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
					"text-color": ["case", ["<", avgExpr, 250.5], "#000000", "#FFFFFF"]
				}
			},
			this.beforeLayer
		);
	}

	private unclusteredLayer(sourceId: string) {
		mapManager.map?.addLayer(
			{
				id: `${sourceId}-unclustered`,
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
