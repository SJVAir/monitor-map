import type { MonitorsPollutant } from "$lib/monitors/types";

/**
 * What the Pollutant menu shows. "none" is not a monitorsManager.pollutant value — it means
 * the monitors plugin is off while the manager keeps its last real pollutant.
 */
export type PollutantSelection = MonitorsPollutant | "none";

export interface PollutantTargets {
	manager: { setPollutant(pollutant: MonitorsPollutant): void };
	options: { monitorsOn: boolean };
}

export function parsePollutantParam(value: unknown): PollutantSelection | null {
	return value === "pm25" || value === "o3" || value === "none" ? value : null;
}

/** A pollutant the map can show, or null. */
export function asPollutant(value: unknown): MonitorsPollutant | null {
	return value === "pm25" || value === "o3" ? value : null;
}

export function currentSelection(
	pollutant: string | null,
	monitorsOn: boolean
): PollutantSelection | null {
	return monitorsOn ? asPollutant(pollutant) : "none";
}

export function applyPollutantSelection(
	selection: PollutantSelection,
	targets: PollutantTargets
): void {
	if (selection === "none") {
		targets.options.monitorsOn = false;
		return;
	}
	targets.manager.setPollutant(selection);
	targets.options.monitorsOn = true;
}
