import type { MonitorsPollutant } from "$lib/monitors/types";
import { applyPollutantSelection, type PollutantTargets } from "./pollutant-param";

/**
 * Defaults restored by "Reset Map Options". Keep in sync with the constructor defaults in each
 * integration (monitors/EV display options, `enabled`, `clustered`) so a reset matches a fresh load.
 */
export const MAP_OPTION_DEFAULTS = {
	monitorTypes: {
		airnow: true,
		aqlite: true,
		aqview: true,
		bam1022: true,
		airgradient: true,
		purpleair: true,
		vozbox: true,
		inactive: false,
		inside: false
	},
	clustered: true,
	collocationSites: false,
	fireAndSmoke: true,
	evStations: false,
	evLevels: { lvl2: true, lvl3: true },
	wind: false
} as const;

type Toggle = { enabled: boolean };
type Option = { value: boolean };

export interface MapOptionTargets extends PollutantTargets {
	integration: PollutantTargets["integration"] & {
		clustered: boolean;
		displayOptions: Record<string, Option>;
	};
	collocationSites: Toggle;
	hmsFire: Toggle;
	hmsSmoke: Toggle;
	evStations: Toggle & { clustered: boolean; displayOptions: { lvl2: Option; lvl3: Option } };
	wind: Toggle;
	mapStyle: { reset(): void };
}

export function applyMapOptionDefaults(
	targets: MapOptionTargets,
	defaultPollutant: MonitorsPollutant | null
): void {
	if (defaultPollutant) {
		applyPollutantSelection(defaultPollutant, targets);
	} else {
		targets.integration.enabled = true;
	}

	for (const [key, value] of Object.entries(MAP_OPTION_DEFAULTS.monitorTypes)) {
		const option = targets.integration.displayOptions[key];
		if (option) option.value = value;
	}
	targets.integration.clustered = MAP_OPTION_DEFAULTS.clustered;

	targets.collocationSites.enabled = MAP_OPTION_DEFAULTS.collocationSites;
	targets.hmsFire.enabled = MAP_OPTION_DEFAULTS.fireAndSmoke;
	targets.hmsSmoke.enabled = MAP_OPTION_DEFAULTS.fireAndSmoke;

	targets.evStations.enabled = MAP_OPTION_DEFAULTS.evStations;
	targets.evStations.clustered = MAP_OPTION_DEFAULTS.clustered;
	targets.evStations.displayOptions.lvl2.value = MAP_OPTION_DEFAULTS.evLevels.lvl2;
	targets.evStations.displayOptions.lvl3.value = MAP_OPTION_DEFAULTS.evLevels.lvl3;

	targets.wind.enabled = MAP_OPTION_DEFAULTS.wind;
	targets.mapStyle.reset();
}
