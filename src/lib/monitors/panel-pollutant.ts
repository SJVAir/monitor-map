/** The pollutants the detail panel can show, in order of preference. */
export const PANEL_POLLUTANTS = ["pm25", "o3"] as const;
export type PanelPollutant = (typeof PANEL_POLLUTANTS)[number];

/** The slice of the SDK's `MonitorDetails` this module reads. */
export interface PanelMonitor {
	type: string;
	is_active: boolean;
	// Only the panel pollutants are read; the SDK's `latest` has more entry types, without an
	// index signature.
	latest: Partial<Record<PanelPollutant, { value?: string }>>;
}

/** The slice of the SDK's `MonitorsMeta` this module reads. */
export interface PanelMeta {
	monitors: Record<string, { entries: Record<string, unknown> } | undefined>;
}

export interface PanelPollutantChoice {
	/** Null when the monitor has no reading and its type publishes neither pollutant. */
	pollutant: PanelPollutant | null;
	/** Whether the monitor has a current reading for `pollutant`. */
	hasReading: boolean;
}

/** The panel pollutants this monitor has a current, numeric reading for. */
export function readingPollutants(monitor: Pick<PanelMonitor, "latest">): PanelPollutant[] {
	return PANEL_POLLUTANTS.filter((pollutant) => {
		const value = monitor.latest[pollutant]?.value;
		return typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value));
	});
}

/**
 * The panel pollutants this monitor type publishes. The API marks each entry type with a
 * `published` flag the SDK does not type; a type that carries the entry without the flag
 * counts as publishing it.
 */
export function publishedPollutants(monitorType: string, meta: PanelMeta): PanelPollutant[] {
	const entries = meta.monitors[monitorType]?.entries ?? {};
	return PANEL_POLLUTANTS.filter((pollutant) => {
		const entry = entries[pollutant] as { published?: boolean } | undefined;
		return entry !== undefined && entry.published !== false;
	});
}

/**
 * The pollutant the detail panel shows: the map's when the monitor has it, otherwise the one
 * the monitor has. A monitor with no current reading (inactive, or nothing reported) still
 * gets a pollutant when there is one to chart, so its past data can be browsed.
 */
export function choosePanelPollutant(
	mapPollutant: PanelPollutant | null,
	monitor: PanelMonitor,
	meta: PanelMeta
): PanelPollutantChoice {
	const withReading = readingPollutants(monitor);
	// The API keeps returning an inactive monitor's last reading, however old, so only an
	// active monitor's readings count as current.
	if (monitor.is_active && withReading.length > 0) {
		const pollutant =
			mapPollutant && withReading.includes(mapPollutant) ? mapPollutant : withReading[0];
		return { pollutant, hasReading: true };
	}

	// Nothing current: chart what the type publishes, or failing that what it last reported.
	const published = publishedPollutants(monitor.type, meta);
	const chartable = published.length > 0 ? published : withReading;
	if (chartable.length > 0) {
		const pollutant =
			mapPollutant && chartable.includes(mapPollutant) ? mapPollutant : chartable[0];
		return { pollutant, hasReading: false };
	}

	return { pollutant: null, hasReading: false };
}
