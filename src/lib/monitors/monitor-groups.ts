/** Monitor display-option keys shown under each Monitors menu group, in display order. */
export const REFERENCE_GRADE_TYPES = ["airnow", "aqlite", "aqview", "bam1022"] as const;
export const LOW_COST_TYPES = ["airgradient", "purpleair", "vozbox"] as const;

export type MonitorGroupType =
	(typeof REFERENCE_GRADE_TYPES)[number] | (typeof LOW_COST_TYPES)[number];

/** The slice of MonitorsMeta needed to know which pollutants a monitor type reports. */
export interface MonitorTypeMeta {
	monitors: Record<string, { entries: Record<string, unknown> } | undefined>;
}

export function typeSupportsPollutant(
	meta: MonitorTypeMeta | null,
	type: string,
	pollutant: string | null
): boolean {
	const deviceMeta = meta?.monitors[type];
	return !!deviceMeta && !!pollutant && pollutant in deviceMeta.entries;
}
