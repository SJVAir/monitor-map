import type { OptionValues } from "@sjvair/map-sdk";

/** The toolbar's defaults (map-sdk's presets plus monitor-map's rows), as a spec fixture. */
export const OPTION_DEFAULTS: OptionValues = {
	inactive: false,
	inside: false,
	collocationSites: false,
	clustered: true,
	fireAndSmoke: true,
	evStations: false,
	"ev:lvl2": true,
	"ev:lvl3": true,
	wind: false
};
