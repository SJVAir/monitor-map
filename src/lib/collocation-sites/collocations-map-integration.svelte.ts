import { Popup, type MapLayerEventType, type Map as MaptilerMap } from "@maptiler/sdk";
import type { Feature, Geometry } from "geojson";
import { mapManager } from "$lib/map/map.svelte.ts";
import { MapGeoJSONIntegration } from "$lib/map/integrations/map-geojson-integration.svelte.ts";
import { MonitorsIconManager } from "./collocations-icon-manager.svelte.ts";
import { TooltipManager } from "$lib/map/integrations/tooltip.svelte.ts";
import { collocationSitesManager } from "./collocations.svelte.ts";
import { monitorsManager } from "$lib/monitors/monitors.svelte.ts";
import { monitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte.ts";

export type CollocationSiteMapFeature = Feature<Geometry, CollocationSiteMarkerProperties>;

export interface CollocationSiteMarkerProperties {
	icon: string;
	colocated_id: string;
	reference_id: string;
	name: string;
}

function collocationTooltip(evt: MapLayerEventType["mousemove"] & object): Popup | void {
	//const feature = cast<CollocationSiteMapFeature, Array<CollocationSiteMapFeature>>(
	//	evt.features,
	//	(features) => {
	//		features.sort((a, b) => b.properties.order - a.properties.order);
	//		return features[0];
	//	}
	//);
	const feature = evt.features![0] as unknown as CollocationSiteMapFeature;

	if (feature) {
		return new Popup({ closeButton: false, closeOnClick: false }).setLngLat(evt.lngLat).setHTML(`
        <div>
          <strong>${feature.properties.name}</strong>
          <br/>
          reference_id: ${feature.properties.reference_id}PM2.5
          <br/>
          colocated_id: ${feature.properties.colocated_id}
        </div>`);
	}
}

class CollocationSitesMapIntegration extends MapGeoJSONIntegration<CollocationSiteMarkerProperties> {
	referenceId: string = "collocation-sites";
	enabled: boolean = $state(false);
	clustered: boolean = $state(true);

	icons: MonitorsIconManager = new MonitorsIconManager();
	tooltipManager: TooltipManager = new TooltipManager();

	features: Array<CollocationSiteMapFeature> = $derived.by(() => {
		if (
			!monitorsManager.meta ||
			!monitorsManager.pollutant ||
			!collocationSitesManager.collocationSites
		) {
			return [];
		}
		//const levels = monitorsManager.meta.entryType(monitorsManager.pollutant).asIter.levels;

		return collocationSitesManager.collocationSites.map((c) => {
			const referenceMonitorFeature = monitorsMapIntegration.features.find(
				(m) => m.properties.id === c.reference_id
			);

			const feature: CollocationSiteMapFeature = {
				type: "Feature",
				properties: {
					icon: referenceMonitorFeature!.properties.icon,
					colocated_id: c.colocated_id,
					reference_id: c.reference_id,
					name: c.name
				},
				geometry: c.position! as Geometry
			};

			//if (levels) {
			//	const level = levels.find((lvl) => {
			//		const value = parseInt(c.latest.value, 10);
			//		return value >= lvl.range[0] && value <= lvl.range[1];
			//	});

			//	if (level) {
			//		feature.properties.icon = getIconId(c, level);
			//	}
			//}

			return feature;
		});
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

	apply() {
		if (!mapManager.map) return;

		if (!this.tooltipManager.has(this.referenceId)) {
			this.tooltipManager.register(this.referenceId, collocationTooltip);
		}

		super.apply();
	}
}

export const collocationSitesMapIntegration = new CollocationSitesMapIntegration();
export type { CollocationSitesMapIntegration as MonitorsMapIntegration };
