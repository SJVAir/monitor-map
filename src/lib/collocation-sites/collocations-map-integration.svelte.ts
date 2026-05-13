import { Popup, type MapLayerEventType, type Map as MaptilerMap } from "@maptiler/sdk";
import type { Geometry } from "geojson";
import { mapManager } from "$lib/map/map.svelte.ts";
import { MapGeoJSONIntegration } from "$lib/map/integrations/map-geojson-integration.svelte.ts";
import {
	CollocationIconManager,
	getCollocationIconId
} from "./collocations-icon-manager.svelte.ts";
import { TooltipManager } from "$lib/map/integrations/tooltip.svelte.ts";
import { collocationSitesManager } from "./collocations.svelte.ts";
import { monitorsManager } from "$lib/monitors/monitors.svelte.ts";
import { monitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte.ts";
import type { CollocationSiteMapFeature, CollocationSiteMarkerProperties } from "./types.ts";
import { untrack } from "svelte";
import CollocationTooltip from "./CollocationTooltip.svelte";
import { mountPopup } from "$lib/map/utils.ts";

function collocationTooltip(evt: MapLayerEventType["mousemove"] & object): Popup | void {
	const feature = evt.features?.[0] as unknown as CollocationSiteMapFeature | undefined;
	if (!feature) return;
	return mountPopup(CollocationTooltip, { feature }, evt.lngLat);
}

class CollocationSitesMapIntegration extends MapGeoJSONIntegration<CollocationSiteMarkerProperties> {
	referenceId: string = "collocation-sites";
	enabled: boolean = $state(false);
	clustered: boolean = $state(true);

	icons: CollocationIconManager = new CollocationIconManager();
	tooltipManager: TooltipManager = new TooltipManager();

	features: Array<CollocationSiteMapFeature> = $derived.by(() => {
		if (
			!monitorsManager.meta ||
			!monitorsManager.pollutant ||
			!collocationSitesManager.collocationSites ||
			monitorsMapIntegration.features.length === 0
		) {
			return [];
		}

		return collocationSitesManager.collocationSites
			.map((c) => {
				const referenceMonitorFeature = monitorsMapIntegration.features.find(
					(m) => m.properties.id === c.reference_id
				);

				if (!referenceMonitorFeature) return;

				const feature: CollocationSiteMapFeature = {
					type: "Feature",
					properties: {
						icon: getCollocationIconId(referenceMonitorFeature!.properties.icon),
						colocated_id: c.colocated_id,
						reference_id: c.reference_id,
						name: c.name
					},
					geometry: c.position! as Geometry
				};

				return feature;
			})
			.filter((f) => f !== undefined);
	});

	mapLayer: Parameters<MaptilerMap["addLayer"]>[0] = {
		id: this.referenceId,
		type: "symbol",
		source: this.referenceId,
		layout: {
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
			$effect(() => {
				const features = this.features;
				if (!mapManager.map || !this.enabled) return;
				mapManager.setDataSource(this.referenceId, features);
			});

			$effect(() => {
				if (monitorsManager.pollutant === "o3") {
					untrack(() => this.remove());
				} else if (untrack(() => this.enabled)) {
					untrack(() => this.apply());
				}
			});
		});
	}

	apply() {
		if (!mapManager.map) return;

		if (!this.tooltipManager.has(this.referenceId)) {
			this.tooltipManager.register(this.referenceId, collocationTooltip, Number.MAX_SAFE_INTEGER);
		}

		this.tooltipManager.enable();

		super.apply();
	}
}

export const collocationSitesMapIntegration = new CollocationSitesMapIntegration();
export type { CollocationSitesMapIntegration as MonitorsMapIntegration };
