import {
	getMonitors,
	getMonitorsLatest,
	getMonitorsMeta,
	type MonitorData,
	type MonitorLatestType,
	type MonitorsMeta,
	type SJVAirEntryLevel
} from "@sjvair/sdk";
import { XMap } from "@tstk/builtin-extensions";
import { Interval } from "@tstk/utils";

class MonitorsManager {
	autoUpdate: Interval = new Interval(async () => await this.update(), 2 * 60 * 1000);
	initialized: boolean = $state(false);

	latest: XMap<string, MonitorLatestType<"pm25" | "o3">> | null = $state(null);
	list: Array<MonitorData> | null = $state(null);

	meta: MonitorsMeta | null = $state(null);

	pollutant: "pm25" | "o3" | null = $state(null);

	levels: Array<SJVAirEntryLevel> | null = $derived(
		this.meta?.entryType(this.pollutant ?? this.meta.default_pollutant).asIter.levels || null
	);

	async init(): Promise<void> {
		if (this.initialized) return;

		[this.list, this.meta] = await Promise.all([getMonitors(), getMonitorsMeta()]);

		this.pollutant = this.meta.default_pollutant;
		this.latest = await getMonitorsLatestMap(this.pollutant);
		this.autoUpdate.start();
		this.initialized = true;
	}

	async update(): Promise<void> {
		if (!this.initialized) return;

		[this.list, this.latest] = await Promise.all([
			getMonitors(),
			getMonitorsLatestMap(this.pollutant || this.meta?.default_pollutant || "pm25")
		]);
	}
}

async function getMonitorsLatestMap(
	pollutant: "pm25" | "o3"
): Promise<XMap<string, MonitorLatestType<"pm25" | "o3">>> {
	const monitors = await getMonitorsLatest(pollutant);
	const latest = new XMap<string, MonitorLatestType<"pm25" | "o3">>();

	for (const monitor of monitors) {
		latest.set(monitor.id, monitor);
	}

	return latest;
}

export const monitorsManager = new MonitorsManager();
export type { MonitorsManager };
