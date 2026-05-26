import type {
	ExpressionSpecification,
	FilterSpecification,
	Map as MaptilerMap,
	Popup
} from "@maptiler/sdk";
import type { Geometry } from "geojson";
import { untrack } from "svelte";
import { mapManager } from "$lib/map/map.svelte.ts";
import { clickManager, type ClickHandler } from "$lib/map/integrations/click-manager.ts";
import { MapGeoJSONIntegration } from "$lib/map/integrations/map-geojson-integration.svelte.ts";
import { MapDisplayOption } from "$lib/map/integrations/map-display-option.svelte.ts";
import { TooltipManager } from "$lib/map/integrations/tooltip.svelte.ts";
import { mountClickPopup } from "$lib/map/utils.ts";
import { evStationsManager } from "./ev-stations.svelte.ts";
import { EvStationIconManager } from "./ev-station-icons.ts";
import {
	EvStationsClusterRenderer,
	type EvStationsClusterContext
} from "./ev-stations-cluster-renderer.ts";
import type { EvStation, EvStationMapFeature, EvStationMarkerProperties } from "./types.ts";
import EvStationTooltip from "./components/EvStationTooltip.svelte";

class EvStationsMapIntegration
	extends MapGeoJSONIntegration<EvStationMarkerProperties>
	implements EvStationsClusterContext
{
	referenceId: string = "ev-stations";
	enabled: boolean = $state(true);
	clustered: boolean = $state(true);

	icons: EvStationIconManager = new EvStationIconManager();
	tooltipManager: TooltipManager = new TooltipManager();
	private renderer: EvStationsClusterRenderer = new EvStationsClusterRenderer(this);
	private currentPopup: Popup | null = null;

	displayOptions = {
		lvl2: new MapDisplayOption("Level 2", false),
		lvl3: new MapDisplayOption("Level 3", false)
	};

	features: Array<EvStationMapFeature> = $derived.by(() => {
		const result: EvStationMapFeature[] = [];
		if (evStationsManager.lvl2Stations) {
			for (const station of evStationsManager.lvl2Stations) {
				result.push(toFeature(station, "lvl2"));
			}
		}
		if (evStationsManager.lvl3Stations) {
			for (const station of evStationsManager.lvl3Stations) {
				result.push(toFeature(station, "lvl3"));
			}
		}
		return result;
	});

	featuresByLevel: Record<string, EvStationMapFeature[]> = $derived.by(() => {
		const byLevel: Record<string, EvStationMapFeature[]> = {};
		for (const feature of this.features) {
			const level = feature.properties.level;
			if (level === "lvl2" && !this.displayOptions.lvl2.value) continue;
			if (level === "lvl3" && !this.displayOptions.lvl3.value) continue;
			const arr = byLevel[level] ?? [];
			arr.push(feature);
			byLevel[level] = arr;
		}
		return byLevel;
	});

	filters: FilterSpecification = $derived.by((): FilterSpecification => {
		const levels: string[] = [];
		if (this.displayOptions.lvl2.value) levels.push("lvl2");
		if (this.displayOptions.lvl3.value) levels.push("lvl3");
		if (levels.length === 0) return ["==", ["get", "level"], "none"] as ExpressionSpecification;
		if (levels.length === 2) return ["boolean", true] as ExpressionSpecification;
		return ["==", ["get", "level"], levels[0]] as ExpressionSpecification;
	});

	private handleStationClick: ClickHandler = (features, evt) => {
		this.currentPopup?.remove();
		const feature = features[0] as unknown as EvStationMapFeature | undefined;
		if (!feature) return;
		this.currentPopup = mountClickPopup(EvStationTooltip, { feature }, evt.lngLat);
		this.currentPopup.addTo(mapManager.map!);
	};

	get mapLayer(): Parameters<MaptilerMap["addLayer"]>[0] {
		return {
			id: this.referenceId,
			type: "symbol",
			source: this.referenceId,
			filter: this.filters,
			layout: {
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
			// Lazy-fetch level data when integration is enabled and level is toggled on
			$effect(() => {
				if (this.displayOptions.lvl2.value && evStationsManager.lvl2Stations === undefined) {
					evStationsManager.fetchLvl2Stations();
				}
			});

			$effect(() => {
				if (this.displayOptions.lvl3.value && evStationsManager.lvl3Stations === undefined) {
					evStationsManager.fetchLvl3Stations();
				}
			});

			// Push filter changes to the unclustered layer
			$effect(() => {
				const filter = this.filters;
				if (!mapManager.map || this.clustered) return;
				if (mapManager.map.getLayer(this.referenceId)) {
					mapManager.map.setFilter(this.referenceId, filter);
				}
			});

			// Sync unclustered source when features change
			$effect(() => {
				const features = this.features;
				if (!mapManager.map || this.clustered) return;
				mapManager.setDataSource(this.referenceId, features);
			});

			// Sync clustered sources when featuresByLevel changes
			$effect(() => {
				void this.featuresByLevel;
				if (!mapManager.map || !this.clustered) return;
				this.renderer.syncFeatures();
			});

			// Re-apply when clustered mode switches or data first arrives
			$effect(() => {
				void this.clustered;
				const hasFeatures = Object.keys(this.featuresByLevel).length > 0;
				if (!untrack(() => mapManager.map) || !hasFeatures) return;
				untrack(() => this.apply());
			});
		});
	}

	apply() {
		if (!mapManager.map) return;

		if (this.clustered) {
			if (mapManager.map.getLayer(this.referenceId)) mapManager.map.removeLayer(this.referenceId);
			if (mapManager.map.getSource(this.referenceId)) mapManager.map.removeSource(this.referenceId);
			clickManager.unregister([this.referenceId]);
			this.tooltipManager.disable();
			this.renderer.remove();
			this.icons.loadIcons().then(() => {
				this.renderer.apply(this.handleStationClick);
				this.tooltipManager.enable();
			});
		} else {
			this.renderer.remove();
			this.tooltipManager.disable();
			clickManager.unregister([this.referenceId]);
			super.apply();
			this.icons.loadIcons().then(() => {
				clickManager.register([this.referenceId], this.handleStationClick);
				this.tooltipManager.enable();
			});
		}
	}

	remove() {
		clickManager.unregister([this.referenceId]);
		clickManager.unregister(this.renderer.unclusteredLayerIds);
		this.renderer.remove();
		this.currentPopup?.remove();
		this.currentPopup = null;
		super.remove();
	}
}

function toFeature(station: EvStation, level: "lvl2" | "lvl3"): EvStationMapFeature {
	return {
		type: "Feature",
		properties: {
			icon: `ev-station-${level}`,
			id: station.id,
			level,
			station_name: station.station_name ?? "",
			facility_type: station.facility_type ?? "",
			ev_network: station.ev_network ?? "",
			station_phone: station.station_phone ?? "",
			street_address: station.street_address ?? "",
			city: station.city ?? "",
			state: station.state ?? "",
			zip: station.zip ?? "",
			access_days_time: station.access_days_time ?? "",
			access_detail_code: station.access_detail_code ?? "",
			cards_accepted: station.cards_accepted ?? null,
			ev_pricing: station.ev_pricing ?? "",
			ev_connector_types: JSON.stringify(station.ev_connector_types ?? [])
		},
		geometry: {
			type: "Point",
			coordinates: [station.longitude, station.latitude]
		} as Geometry
	};
}

export const evStationsMapIntegration = new EvStationsMapIntegration();
export type { EvStationsMapIntegration };
