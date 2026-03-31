import {
	MapStyle,
	MapStyleVariant,
	config as MaptilerConfig,
	Map as MaptilerMap
} from "@maptiler/sdk";
import type { Attachment } from "svelte/attachments";
import { isGeoJSONSource } from "./utils";
import type { Feature, GeoJsonProperties, Geometry } from "geojson";

MaptilerConfig.apiKey = import.meta.env.VITE_MAPTILER_KEY;

export const DefaultMapStyle: MapStyleVariant = MapStyle.STREETS_V4.DEFAULT;
const excludeLayers = ["Sport", "Tourism", "Culture", "Shopping", "Food", "Transport"];

class MapManager {
	map: MaptilerMap | null = $state(null);

	setDataSource(sourceId: string, features: Array<Feature<Geometry, GeoJsonProperties>>): void {
		const source = mapManager.map?.getSource(sourceId);

		if (isGeoJSONSource(source)) {
			console.log(`Setting data for source ${sourceId} with ${features.length} features.`);
			source.setData({
				type: "FeatureCollection",
				features
			});
		}
	}

	refreshMap(): void {
		if (mapManager.map) {
			this.removeExcludedLayers();
		}
	}

	removeExcludedLayers(): void {
		for (const toExclude of excludeLayers) {
			if (mapManager.map?.getLayer(toExclude)) {
				mapManager.map.removeLayer(toExclude);
			}
		}
	}

	removeMap(): void {
		return mapManager.map?.remove();
	}
}

export const mapManager = new MapManager();
export type { MapManager };

export const initializeMap: Attachment<HTMLDivElement> = (container: string | HTMLElement) => {
	console.log("initialising map!");
	const map = new MaptilerMap({
		container: container,
		center: [-119.7987626619462, 36.76272050981146],
		zoom: 7,
		style: DefaultMapStyle,
		projection: "globe",
		space: {
			preset: "milkyway"
		}
	});

	map.once("idle", () => {
		mapManager.map = map;
	});

	return () => map.remove();
};
