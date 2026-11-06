/** The map options the toolbar edits; `mapOptions` holds the live copy. */
export interface MapOptions {
	/** False for the Pollutant menu's "None": no monitors (or collocation sites) on the map. */
	monitorsOn: boolean;
	/** Which monitor types draw, keyed by server type; a type with no key never draws. */
	monitorTypes: Record<string, boolean>;
	inactive: boolean;
	inside: boolean;
	/** Monitors' and EV chargers' clustering. */
	clustered: boolean;
	collocationSites: boolean;
	/** HMS smoke and fire together. */
	fireAndSmoke: boolean;
	evStations: boolean;
	evLevels: { lvl2: boolean; lvl3: boolean };
	wind: boolean;
}

/** Defaults restored by "Reset Map Options"; a fresh load starts at them too. */
export const MAP_OPTION_DEFAULTS = {
	monitorTypes: {
		airnow: true,
		aqlite: true,
		aqview: true,
		bam1022: true,
		airgradient: true,
		purpleair: true,
		vozbox: true
	},
	inactive: false,
	inside: false,
	clustered: true,
	collocationSites: false,
	fireAndSmoke: true,
	evStations: false,
	evLevels: { lvl2: true, lvl3: true },
	wind: false
} as const satisfies Omit<MapOptions, "monitorsOn">;

/** A fresh copy of the defaults, with monitors on. */
export function defaultMapOptions(): MapOptions {
	return {
		...MAP_OPTION_DEFAULTS,
		monitorsOn: true,
		monitorTypes: { ...MAP_OPTION_DEFAULTS.monitorTypes },
		evLevels: { ...MAP_OPTION_DEFAULTS.evLevels }
	};
}
