import type { GeoJSONSource, MapLayerEventType, Popup } from "@maptiler/sdk";
import type { Point } from "geojson";
import { mapManager } from "$lib/map/map.svelte.ts";
import { mountPopup } from "$lib/map/utils.ts";
import { clickManager, type ClickHandler } from "$lib/map/integrations/click-manager.ts";
import { TooltipManager } from "$lib/map/integrations/tooltip.svelte.ts";
import { EV_STATION_LEVELS, type EvStationLevel } from "./ev-station-icons.ts";
import type { EvStationClusterMapFeature, EvStationMapFeature } from "./types.ts";
import EvStationClusterTooltip from "./components/EvStationClusterTooltip.svelte";

export interface EvStationsClusterContext {
	referenceId: string;
	featuresByLevel: Record<string, EvStationMapFeature[]>;
	beforeLayer?: string;
	tooltipManager: TooltipManager;
}

function clusterTooltip(evt: MapLayerEventType["mousemove"] & object): Popup | void {
	const feature = evt.features?.[0] as unknown as EvStationClusterMapFeature | undefined;
	if (!feature) return;
	return mountPopup(EvStationClusterTooltip, { feature }, evt.lngLat);
}

export class EvStationsClusterRenderer {
	private _levels: EvStationLevel[] = [];

	constructor(private ctx: EvStationsClusterContext) {}

	apply(stationClickHandler: ClickHandler): void {
		if (!mapManager.map) return;

		for (const level of Object.keys(EV_STATION_LEVELS) as EvStationLevel[]) {
			const sourceId = `${this.ctx.referenceId}-${level}`;
			const features = this.ctx.featuresByLevel[level] ?? [];
			const { bg } = EV_STATION_LEVELS[level];
			const clusterBg = bg.replace("rgb(", "rgba(").replace(")", ", 0.6)");

			mapManager.map.addSource(sourceId, {
				type: "geojson",
				promoteId: "id",
				data: { type: "FeatureCollection", features },
				cluster: true,
				clusterRadius: 40,
				clusterMaxZoom: 9
			});

			mapManager.map.addLayer(
				{
					id: `${sourceId}-cluster-circle`,
					type: "circle",
					source: sourceId,
					filter: ["has", "point_count"],
					paint: {
						"circle-color": clusterBg,
						"circle-radius": ["step", ["get", "point_count"], 15, 10, 20, 25, 25]
					}
				},
				this.ctx.beforeLayer
			);

			mapManager.map.addLayer(
				{
					id: `${sourceId}-cluster-label`,
					type: "symbol",
					source: sourceId,
					filter: ["has", "point_count"],
					layout: {
						"text-field": ["get", "point_count_abbreviated"],
						"text-size": 12,
						"text-allow-overlap": true,
						"text-ignore-placement": true
					},
					paint: { "text-color": "#ffffff" }
				},
				this.ctx.beforeLayer
			);

			mapManager.map.addLayer(
				{
					id: `${sourceId}-unclustered`,
					type: "symbol",
					source: sourceId,
					filter: ["!", ["has", "point_count"]],
					layout: {
						"icon-image": `ev-station-${level}`,
						"icon-allow-overlap": true,
						"icon-ignore-placement": true,
						"icon-size": 1
					},
					paint: {}
				},
				this.ctx.beforeLayer
			);

			const circleLayerId = `${sourceId}-cluster-circle`;
			const unclusteredLayerId = `${sourceId}-unclustered`;

			if (!this.ctx.tooltipManager.has(circleLayerId)) {
				this.ctx.tooltipManager.register(circleLayerId, clusterTooltip);
			}

			clickManager.register([circleLayerId], this.makeClusterClickHandler(sourceId));
			clickManager.register([unclusteredLayerId], stationClickHandler);

			this._levels.push(level);
		}
	}

	remove(): void {
		if (!mapManager.map) return;

		for (const level of this._levels) {
			const sourceId = `${this.ctx.referenceId}-${level}`;
			const layerIds = [
				`${sourceId}-cluster-circle`,
				`${sourceId}-cluster-label`,
				`${sourceId}-unclustered`
			];

			for (const layerId of layerIds) {
				clickManager.unregister([layerId]);
				if (mapManager.map.getLayer(layerId)) {
					mapManager.map.removeLayer(layerId);
				}
			}

			if (mapManager.map.getSource(sourceId)) {
				mapManager.map.removeSource(sourceId);
			}
		}

		this._levels = [];
	}

	get unclusteredLayerIds(): string[] {
		return this._levels.map((level) => `${this.ctx.referenceId}-${level}-unclustered`);
	}

	syncFeatures(): void {
		if (!mapManager.map) return;
		for (const level of this._levels) {
			const sourceId = `${this.ctx.referenceId}-${level}`;
			mapManager.setDataSource(sourceId, this.ctx.featuresByLevel[level] ?? []);
		}
	}

	private makeClusterClickHandler(sourceId: string): ClickHandler {
		return async (features) => {
			try {
				const feature = features[0];
				if (!feature?.properties?.cluster_id) return;
				const source = mapManager.map?.getSource(sourceId) as GeoJSONSource | undefined;
				if (!source) return;
				const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id);
				const coords = (feature.geometry as Point).coordinates as [number, number];
				mapManager.map?.easeTo({ center: coords, zoom });
			} catch (err) {
				console.error("EvStations: cluster expansion zoom failed", err);
			}
		};
	}
}
