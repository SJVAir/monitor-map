import { config, type CustomLayerInterface } from "@maptiler/sdk";
import { WindLayer } from "@maptiler/weather";
import type { MapPlugin } from "@sjvair/map-sdk";
import { monitorMapConfig } from "../config.svelte.js";

export interface WindPluginOptions {
	/** Builds the layer; runs again on each restyle. Defaults to a `@maptiler/weather` WindLayer. */
	createLayer?: (id: string) => CustomLayerInterface;
}

// The weather layer fetches its data with the SDK's global key, which map-sdk (it passes the key
// to the map only) never sets.
const defaultCreateLayer = (id: string) => {
	config.apiKey = monitorMapConfig().maptilerKey;
	return new WindLayer({ id, opacity: 0.5 }) as unknown as CustomLayerInterface;
};

/**
 * Wind particles as a map-sdk custom layer. `@maptiler/weather` can't be a map-sdk dependency, so
 * the host adds it here; only the layout chunk reaches this module.
 */
export function windPlugin(options: WindPluginOptions = {}): MapPlugin {
	const createLayer = options.createLayer ?? defaultCreateLayer;
	return {
		id: "wind",
		label: "Wind",
		selectable: false,
		setup(ctx) {
			ctx.addCustomLayer("wind", createLayer);
			return () => {};
		}
	};
}
