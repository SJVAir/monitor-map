import type { MonitorsPollutant } from "$lib/monitors/types";

/**
 * What the Pollutant menu shows. "none" is not a monitorsManager.pollutant value — it means
 * the monitors integration is disabled while the manager keeps its last real pollutant.
 */
export type PollutantSelection = MonitorsPollutant | "none";

export interface PollutantTargets {
	manager: { pollutant: MonitorsPollutant | null };
	integration: { enabled: boolean };
}

export function parsePollutantParam(value: unknown): PollutantSelection | null {
	return value === "pm25" || value === "o3" || value === "none" ? value : null;
}

export function currentSelection(
	pollutant: MonitorsPollutant | null,
	monitorsEnabled: boolean
): PollutantSelection | null {
	return monitorsEnabled ? pollutant : "none";
}

export function applyPollutantSelection(
	selection: PollutantSelection,
	targets: PollutantTargets
): void {
	if (selection === "none") {
		targets.integration.enabled = false;
		return;
	}
	targets.manager.pollutant = selection;
	targets.integration.enabled = true;
}
