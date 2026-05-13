import type {
	ExpressionSpecification,
	FilterSpecification,
	GeoJSONSource,
	MapLayerEventType,
	Popup
} from "@maptiler/sdk";
import type { Point } from "geojson";
import type { SJVAirEntryLevel } from "@sjvair/sdk";
import { mapManager } from "$lib/map/map.svelte.ts";
import { mountPopup } from "$lib/map/utils.ts";
import { clickManager, type ClickHandler } from "$lib/map/integrations/click-manager.ts";
import { TooltipManager } from "$lib/map/integrations/tooltip.svelte.ts";
import { getTypeShape } from "./monitor-utils.ts";
import type { MonitorClusterMapFeature, MonitorMapFeature } from "./types.ts";
import MonitorTooltip from "./MonitorTooltip.svelte";
import MonitorClusterTooltip from "./MonitorClusterTooltip.svelte";

const AVG_EXPR: ExpressionSpecification = [
	"/",
	["get", "sumValues"],
	["max", ["get", "point_count"], 1]
];

export function monitorTooltip(evt: MapLayerEventType["mousemove"] & object): Popup | void {
	const features = evt.features as unknown as Array<MonitorMapFeature> | undefined;
	const feature = features?.sort((a, b) => b.properties.order - a.properties.order)[0];
	if (!feature) return;
	return mountPopup(MonitorTooltip, { feature }, evt.lngLat);
}

function clusterTooltip(evt: MapLayerEventType["mousemove"] & object): Popup | void {
	const feature = evt.features?.[0] as unknown as MonitorClusterMapFeature | undefined;
	if (!feature) return;
	return mountPopup(MonitorClusterTooltip, { feature }, evt.lngLat);
}

export interface MonitorsClusterContext {
	referenceId: string;
	featuresByType: Record<string, MonitorMapFeature[]>;
	filters: FilterSpecification;
	clusterIconThresholds: SJVAirEntryLevel[];
	beforeLayer?: string;
	tooltipManager: TooltipManager;
}

export class MonitorsClusterRenderer {
	private _clusterTypes: string[] = [];

	constructor(private ctx: MonitorsClusterContext) {}

	apply(monitorClickHandler: ClickHandler): void {
		if (!mapManager.map) return;

		const sortedEntries = Object.entries(this.ctx.featuresByType).sort(([, a], [, b]) => {
			const maxOrder = (fs: MonitorMapFeature[]) =>
				fs.reduce((m, f) => Math.max(m, f.properties.order), 0);
			return maxOrder(a) - maxOrder(b);
		});

		for (const [[type, features], index] of sortedEntries.map((e, i) => [e, i] as const)) {
			const sourceId = `${this.ctx.referenceId}-${type}`;

			mapManager.map.addSource(sourceId, {
				type: "geojson",
				promoteId: "id",
				data: { type: "FeatureCollection", features },
				cluster: true,
				clusterRadius: 40,
				clusterMaxZoom: 9,
				clusterProperties: {
					sumValues: ["+", ["to-number", ["get", "value"]], 0]
				}
			});

			this.monitorTypeIconsLayer(sourceId, AVG_EXPR, getTypeShape(type));
			this.clusterCountLayer(sourceId, AVG_EXPR);
			this.unclusteredLayer(sourceId);

			const { icon, unclustered } = this.clusterLayerIds(sourceId);

			if (!this.ctx.tooltipManager.has(icon)) {
				this.ctx.tooltipManager.register(icon, clusterTooltip, index);
			}
			if (!this.ctx.tooltipManager.has(unclustered)) {
				this.ctx.tooltipManager.register(unclustered, monitorTooltip, index);
			}

			clickManager.register([unclustered], monitorClickHandler);
			clickManager.register([icon], this.makeClusterClickHandler(sourceId));

			this._clusterTypes.push(type);
		}
	}

	remove(): void {
		if (!mapManager.map) return;

		for (const type of this._clusterTypes) {
			const sourceId = `${this.ctx.referenceId}-${type}`;
			const layers = this.clusterLayerIds(sourceId);
			clickManager.unregister([layers.unclustered]);
			clickManager.unregister([layers.icon]);
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

	syncFeatures(): void {
		if (!mapManager.map) return;
		for (const type of this._clusterTypes) {
			const sourceId = `${this.ctx.referenceId}-${type}`;
			mapManager.setDataSource(sourceId, this.ctx.featuresByType[type] ?? []);
		}
	}

	syncFilter(): void {
		if (!mapManager.map) return;

		for (const type of this._clusterTypes) {
			const sourceId = `${this.ctx.referenceId}-${type}`;
			const { unclustered } = this.clusterLayerIds(sourceId);
			if (mapManager.map.getLayer(unclustered)) {
				mapManager.map.setFilter(unclustered, [
					"all",
					this.ctx.filters as ExpressionSpecification,
					["!", ["has", "point_count"]]
				]);
			}
		}
	}

	syncThresholds(): void {
		if (!mapManager.map) return;

		for (const type of this._clusterTypes) {
			const sourceId = `${this.ctx.referenceId}-${type}`;
			const { icon, average } = this.clusterLayerIds(sourceId);

			if (mapManager.map.getLayer(icon)) {
				mapManager.map.setLayoutProperty(
					icon,
					"icon-image",
					this.buildClusterIconExpression(AVG_EXPR, getTypeShape(type))
				);
			}
			if (mapManager.map.getLayer(average)) {
				mapManager.map.setPaintProperty(average, "text-color", this.clusterTextColorExpr(AVG_EXPR));
			}
		}
	}

	private makeClusterClickHandler(sourceId: string): ClickHandler {
		return async (features) => {
			const feature = features[0];
			if (!feature?.properties?.cluster_id) return;
			const source = mapManager.map?.getSource(sourceId) as GeoJSONSource | undefined;
			if (!source) return;
			const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id);
			const coords = (feature.geometry as Point).coordinates as [number, number];
			mapManager.map?.easeTo({ center: coords, zoom });
		};
	}

	private clusterLayerIds(sourceId: string): {
		icon: string;
		average: string;
		unclustered: string;
	} {
		return {
			icon: `${sourceId}-cluster-icon`,
			average: `${sourceId}-cluster-average`,
			unclustered: `${sourceId}-unclustered`
		};
	}

	private get clusterTextColorThreshold(): number {
		// Use the max of the 3rd level (unhealthy_sensitive) so text flips to white at unhealthy+
		return this.ctx.clusterIconThresholds[2]?.range[1] ?? 150.5;
	}

	private clusterTextColorExpr(avgExpr: ExpressionSpecification): ExpressionSpecification {
		return ["case", ["<=", avgExpr, this.clusterTextColorThreshold], "#000000", "#FFFFFF"];
	}

	private buildClusterIconExpression(
		avgExpr: ExpressionSpecification,
		shape: string
	): ExpressionSpecification {
		const thresholds = this.ctx.clusterIconThresholds;
		if (!thresholds.length) return `outside-default-${shape}` as unknown as ExpressionSpecification;

		const expr: unknown[] = ["case"];
		for (const level of thresholds.slice(0, -1)) {
			expr.push(["<=", avgExpr, level.range[1]], `outside-${level.name}-${shape}`);
		}
		expr.push(`outside-${thresholds.at(-1)!.name}-${shape}`);
		return expr as ExpressionSpecification;
	}

	private monitorTypeIconsLayer(
		sourceId: string,
		avgExpr: ExpressionSpecification,
		shape: string
	): void {
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
			this.ctx.beforeLayer
		);
	}

	private clusterCountLayer(sourceId: string, avgExpr: ExpressionSpecification): void {
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
					"text-color": this.clusterTextColorExpr(avgExpr)
				}
			},
			this.ctx.beforeLayer
		);
	}

	private unclusteredLayer(sourceId: string): void {
		const { unclustered } = this.clusterLayerIds(sourceId);
		mapManager.map?.addLayer(
			{
				id: unclustered,
				type: "symbol",
				source: sourceId,
				filter: ["all", this.ctx.filters as ExpressionSpecification, ["!", ["has", "point_count"]]],
				layout: {
					"symbol-sort-key": ["coalesce", ["get", "order"], 0],
					"icon-allow-overlap": true,
					"icon-ignore-placement": true,
					"icon-image": ["get", "icon"],
					"icon-size": 1
				},
				paint: {}
			},
			this.ctx.beforeLayer
		);
	}
}
