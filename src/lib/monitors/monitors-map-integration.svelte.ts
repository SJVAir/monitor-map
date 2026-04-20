import {
	Popup,
	type ExpressionSpecification,
	type FilterSpecification,
	type MapLayerEventType,
	type Map as MaptilerMap
} from "@maptiler/sdk";
import type { MonitorData, MonitorType } from "@sjvair/sdk";
import { cast } from "@tstk/utils";
import type { Feature, Geometry } from "geojson";
import { mapManager } from "$lib/map/map.svelte.ts";
import { MapGeoJSONIntegration } from "$lib/map/integrations/map-geojson-integration.svelte.ts";
import { monitorsManager } from "./monitors.svelte.ts";
import { getIconId, MonitorsIconManager } from "./monitors-icon-manager.svelte.ts";
import { TooltipManager } from "$lib/map/integrations/tooltip.svelte.ts";

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

//const REFERENCE_ID: string = "monitors";
//const icons: MonitorsIconManager = new MonitorsIconManager();
//const tooltipManager: TooltipManager = new TooltipManager();

//const features: Array<MonitorMapFeature> = $derived.by(() => {
//	console.log("updating monitor features");
//
//	if (!monitorsManager.meta || !monitorsManager.latest || !monitorsManager.pollutant) {
//		return [];
//	}
//	const levels = monitorsManager.meta.entryType(monitorsManager.pollutant).asIter.levels;
//
//	return Array.from(
//		monitorsManager.latest.values().map((m) => {
//			const feature: MonitorMapFeature = {
//				type: "Feature",
//				properties: {
//					icon: "outside-default-square",
//					id: m.id,
//					is_active: m.is_active,
//					is_sjvair: m.is_sjvair,
//					location: m.location,
//					name: m.name,
//					order: getOrder(m),
//					type: m.type,
//					value: m.latest.value
//				},
//				geometry: m.position! as Geometry
//			};
//
//			if (levels) {
//				const level = levels.find((lvl) => {
//					const value = parseInt(m.latest.value, 10);
//					return value >= lvl.range[0] && value <= lvl.range[1];
//				});
//
//				if (level) {
//					feature.properties.icon = getIconId(m, level);
//				}
//			}
//
//			return feature;
//		})
//	);
//});
//export function getFeatures(): Array<MonitorMapFeature> {
//	return features;
//}

//export const mapLayer: Parameters<MaptilerMap["addLayer"]>[0] = {
//	id: REFERENCE_ID,
//	type: "symbol",
//	source: REFERENCE_ID,
//	//filter: this.filters,
//	layout: {
//		"symbol-sort-key": ["get", "order"],
//		"icon-allow-overlap": true,
//		"icon-ignore-placement": true,
//		"icon-image": ["get", "icon"],
//		"icon-size": 1
//	},
//	paint: {}
//};

//function getIconShape(monitorType: string): string {
//  switch (monitorType) {
//    case "airgradient":
//      return "circle";
//
//    case "airnow":
//    case "aqview":
//    case "bam1022":
//      return "triangle";
//
//    case "purpleair":
//      return "square";
//
//    default:
//      throw new Error(`Icon shape for ${monitorType} has not been set`);
//  }
//}

function getOrder(monitor: MonitorData): number {
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
	enabled: boolean = true;

	icons: MonitorsIconManager = new MonitorsIconManager();
	tooltipManager: TooltipManager = new TooltipManager();

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

	//filters: FilterSpecification = ["all"] as FilterSpecification;
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

		//if (display.otherOptions.find(o => o.label === "PurpleAir")?.value) monitorFilters.push(filters.purpleair());
		//if (display.otherOptions.find(o => o.label === "AQview")?.value) monitorFilters.push(filters.monitor("aqview"));
		//if (display.otherOptions.find(o => o.label === "SJVAir FEM")?.value) monitorFilters.push(filters.monitor("bam1022"));
		//if (display.otherOptions.find(o => o.label === "AirNow")?.value) monitorFilters.push(filters.monitor("airnow"));
		//if (display.otherOptions.find(o => o.label === "SJVAir non-FEM")?.value) monitorFilters.push(filters.sjvPurpleair(), filters.monitor("airgradient"));
		//if (display.otherOptions.find(o => o.label === "Inside")?.value) locationFilters.push(["==", ["get", "location"], "inside"]);
		//if (display.otherOptions.find(o => o.label === "Inactive")?.value) statusFilters.push(["==", ["get", "is_active"], false]);

		return ["all", monitorFilters, locationFilters, statusFilters];
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
			$effect(() => {
				const filter = this.filters; // tracked by $derived
				if (mapManager.map?.getLayer(this.referenceId)) {
					mapManager.map.setFilter(this.referenceId, filter);
				}
			});
		});
	}

	// Override applyTo to create one clustered source per type and add cluster layers.
	apply() {
		if (!mapManager.map) return;

		if (!this.tooltipManager.has(this.referenceId)) {
			this.tooltipManager.register(this.referenceId, monitorTooltip);
		}

		this.tooltipManager.enable();

		super.apply();
	}
}

export const monitorsMapIntegration = new MonitorsMapIntegration();
export type { MonitorsMapIntegration };
