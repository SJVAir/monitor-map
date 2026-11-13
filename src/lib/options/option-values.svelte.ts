import type { OptionValues } from "@sjvair/map-sdk";
import {
	applyPollutantSelection,
	currentSelection,
	parsePollutantParam,
	type PollutantTargets
} from "./pollutant-param";

/** The toolbar's values minus `pollutant` (the monitors manager owns that one). */
export const mapOptions: OptionValues = $state({});

/** Whether the monitors plugin is on; pollutant "none" turns it off. */
export const monitorsDisplay: { monitorsOn: boolean } = $state({ monitorsOn: true });

export const MONITOR_MAP_DEFAULTS: OptionValues = {
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

/** A monitor type is on unless its value is explicitly false. */
export function typeOn(values: OptionValues, type: string): boolean {
	return values["type:" + type] !== false;
}

/** The preset's defaults with monitor-map's own table winning. */
export function toolbarDefaults(presetDefaults: OptionValues): OptionValues {
	return { ...presetDefaults, ...MONITOR_MAP_DEFAULTS };
}

/** Fills keys missing from `mapOptions`; never overwrites, so values survive a remount. */
export function initMapOptions(defaults: OptionValues): void {
	for (const [key, value] of Object.entries(defaults)) {
		if (!(key in mapOptions)) mapOptions[key] = value;
	}
}

export function toolbarValues(
	pollutant: string | null,
	monitorsOn: boolean,
	fallbackPollutant: string
): OptionValues {
	return {
		...mapOptions,
		pollutant: currentSelection(pollutant, monitorsOn) ?? fallbackPollutant
	};
}

export function applyOptionChange(
	next: OptionValues,
	changed: string[],
	targets: {
		manager: PollutantTargets["manager"];
		basemap: { select(id: string): void };
	}
): void {
	for (const key of changed) {
		if (key === "pollutant") {
			const selection = parsePollutantParam(next.pollutant);
			if (selection) {
				applyPollutantSelection(selection, {
					manager: targets.manager,
					options: monitorsDisplay
				});
			}
			continue;
		}
		mapOptions[key] = next[key];
		if (key === "basemap" && typeof next.basemap === "string") {
			targets.basemap.select(next.basemap);
		}
	}
}

/** Shows the default basemap on each mount and follows fallbacks; returns the unsubscribe. */
export function bindBasemap(basemap: {
	defaultId: string;
	onFallback(handler: (id: string) => void): () => void;
}): () => void {
	mapOptions.basemap = basemap.defaultId;
	return basemap.onFallback((id) => {
		mapOptions.basemap = id;
	});
}
