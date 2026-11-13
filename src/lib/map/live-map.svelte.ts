import { createMap, defaultBasemaps, type MapContext } from "@sjvair/map-sdk";
import { monitorMapConfig } from "../config.svelte.js";

/** The San Joaquin Valley view the map opens on. */
const INITIAL_VIEW = {
	center: [-119.7987626619462, 36.76272050981146] as [number, number],
	zoom: 7,
	bearing: 0,
	pitch: 0
};

/** The monitor map's map context: a globe over space on Streets v4, with map-sdk's basemaps. */
export function createLiveMap(): MapContext {
	return createMap({
		config: {
			maptilerKey: monitorMapConfig().maptilerKey,
			initialView: INITIAL_VIEW,
			projection: "globe",
			space: { preset: "milkyway" },
			basemaps: defaultBasemaps({ keepPoiLabels: true })
		}
	});
}
