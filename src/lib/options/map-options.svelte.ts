import { monitorsManager } from "../monitors/monitors.svelte.js";
import type { MonitorsPollutant } from "../monitors/types";
import { defaultMapOptions, MAP_OPTION_DEFAULTS, type MapOptions } from "./map-option-defaults";

export type { MapOptions } from "./map-option-defaults";

/**
 * The toolbar's map options. Module-level, so they survive the layout remounting (as the 4.x
 * integrations' state did); the layout turns them into map-sdk plugins.
 */
export const mapOptions: MapOptions = $state(defaultMapOptions());

/**
 * "Reset Map Options": every option back to its default, monitors on, and the pollutant back to
 * `defaultPollutant` (the server's default; null before the meta loads leaves it as it is).
 */
export function resetMapOptions(defaultPollutant: MonitorsPollutant | null): void {
	if (defaultPollutant) monitorsManager.setPollutant(defaultPollutant);
	mapOptions.monitorsOn = true;
	Object.assign(mapOptions.monitorTypes, MAP_OPTION_DEFAULTS.monitorTypes);
	mapOptions.inactive = MAP_OPTION_DEFAULTS.inactive;
	mapOptions.inside = MAP_OPTION_DEFAULTS.inside;
	mapOptions.clustered = MAP_OPTION_DEFAULTS.clustered;
	mapOptions.collocationSites = MAP_OPTION_DEFAULTS.collocationSites;
	mapOptions.fireAndSmoke = MAP_OPTION_DEFAULTS.fireAndSmoke;
	mapOptions.evStations = MAP_OPTION_DEFAULTS.evStations;
	mapOptions.evLevels.lvl2 = MAP_OPTION_DEFAULTS.evLevels.lvl2;
	mapOptions.evLevels.lvl3 = MAP_OPTION_DEFAULTS.evLevels.lvl3;
	mapOptions.wind = MAP_OPTION_DEFAULTS.wind;
}
