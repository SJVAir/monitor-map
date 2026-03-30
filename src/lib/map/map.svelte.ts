import { config as MaptilerConfig, Map as MaptilerMap, MapStyle } from "@maptiler/sdk";
//import { disable as disableLoadScreen } from "$lib/loading/screen/LoadScreen.svelte";
import type { Attachment } from "svelte/attachments";
import { isGeoJSONSource } from "./utils";
import type { Feature, GeoJsonProperties, Geometry } from "geojson";

MaptilerConfig.apiKey = import.meta.env.VITE_MAPTILER_KEY;

const excludeLayers = ["Sport", "Tourism", "Culture", "Shopping", "Food", "Transport"];

//interface MapState {
//	map: MaptilerMap | null;
//}
//export const mapState: MapState = $state({
//	map: null
//});

export const initializeMap: Attachment<HTMLDivElement> = (container: string | HTMLElement) => {
	const map = new MaptilerMap({
		container: container,
		center: [-119.7987626619462, 36.76272050981146],
		zoom: 7,
		style: MapStyle.STREETS,
		projection: "globe",
		space: {
			preset: "milkyway"
		}
	});

	map.on("load", async () => {
		//map.once("idle", () => {
		//  disableLoadScreen();
		//});

		//mapState.map = map;
		mapManager.map = map;
	});

	return () => map.remove();
};

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
