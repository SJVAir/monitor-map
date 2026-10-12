import {
	getMonitors,
	getMonitorsList,
	getMonitorsMeta,
	type MonitorData,
	type MonitorLatestType,
	type MonitorsMeta,
	type SJVAirEntryLevel
} from "@sjvair/sdk";
import { XMap } from "@tstk/builtin-extensions";
import { Interval } from "@tstk/utils";
import { untrack } from "svelte";
import type { MonitorsDataSource, MonitorsPollutant } from "./types";

class MonitorsManager implements MonitorsDataSource {
	autoUpdate: Interval = new Interval(async () => await this.update(), 2 * 60 * 1000);
	initialized: boolean = $state(false);

	latest: XMap<string, MonitorLatestType<"pm25" | "o3">> | null = $state(null);
	list: Array<MonitorData> | null = $state(null);

	meta: MonitorsMeta | null = $state(null);

	pollutant: "pm25" | "o3" | null = $state(null);

	levels: Array<SJVAirEntryLevel> | null = $derived(
		this.meta?.entryType(this.pollutant ?? this.meta.default_pollutant).asIter.levels || null
	);

	#initPromise: Promise<void> | null = null;
	#requestedPollutant: MonitorsPollutant | null = null;

	constructor() {
		// Refetch monitors when the pollutant changes after the initial load, wherever the change
		// comes from (Pollutant menu, URL sync, a host's own UI). Clearing first blanks the markers
		// instead of briefly coloring them with the previous pollutant's readings.
		let fetchedPollutant: string | null = null;
		$effect.root(() => {
			$effect(() => {
				const pollutant = this.pollutant;
				if (!this.initialized) return;
				if (fetchedPollutant !== null && fetchedPollutant !== pollutant) {
					untrack(() => {
						this.list = [];
						this.latest = null;
						this.update();
					});
				}
				fetchedPollutant = pollutant;
			});
		});
	}

	/**
	 * Safe to call from several places: overlapping calls share one run, and a failed run can
	 * be retried. An explicit "pm25"/"o3" wins over a call without one, whichever came first;
	 * between two explicit values the most recent wins.
	 */
	init(urlPollutant?: string | number | boolean): Promise<void> {
		if (this.initialized) return Promise.resolve();

		if (urlPollutant === "pm25" || urlPollutant === "o3") {
			this.#requestedPollutant = urlPollutant;
		}

		this.#initPromise ??= this.#runInit().finally(() => {
			this.#initPromise = null;
			this.#requestedPollutant = null;
		});

		return this.#initPromise;
	}

	async #runInit(): Promise<void> {
		// The pollutant the latest readings were requested for.
		let fetchedPollutant = this.#requestedPollutant;

		const metaRequest = getMonitorsMeta();
		const listAndMeta = Promise.all([getMonitorsList(), metaRequest]).then(([list, meta]) => {
			this.list = list;
			this.meta = meta;
			return meta;
		});
		// The latest readings only need the pollutant, so they never wait for the list.
		const latestRequest = fetchedPollutant
			? getMonitorsLatestMap(fetchedPollutant)
			: metaRequest.then((meta) => {
					fetchedPollutant = meta.default_pollutant;
					return getMonitorsLatestMap(meta.default_pollutant);
				});

		// One Promise.all so a failure in either never leaves the other unhandled.
		const [meta, firstLatest] = await Promise.all([listAndMeta, latestRequest]);
		let latest = firstLatest;

		// An explicit pollutant may have arrived while the requests above were in flight.
		let wanted = this.#requestedPollutant ?? meta.default_pollutant;
		while (wanted !== fetchedPollutant) {
			latest = await getMonitorsLatestMap(wanted);
			fetchedPollutant = wanted;
			wanted = this.#requestedPollutant ?? meta.default_pollutant;
		}

		this.pollutant = fetchedPollutant;
		this.latest = latest;
		this.autoUpdate.start();
		this.initialized = true;
	}

	/**
	 * Restarts polling after something stopped it (MonitorMapLayout stops it on destroy),
	 * refreshing first since the data may be stale. A no-op before init or while polling.
	 */
	resumeAutoUpdate(): void {
		if (!this.initialized || this.autoUpdate.isActive) return;

		this.update().catch(console.error);
		this.autoUpdate.start();
	}

	async update(): Promise<void> {
		if (!this.initialized) return;

		const pollutant = this.pollutant;
		const [list, latest] = await Promise.all([
			getMonitorsList(),
			getMonitorsLatestMap(pollutant || this.meta?.default_pollutant || "pm25")
		]);

		// The pollutant changed while this was in flight: these readings belong to the previous
		// one, and the change has already started its own update.
		if (this.pollutant !== pollutant) return;

		this.list = list;
		this.latest = latest;
	}
}

async function getMonitorsLatestMap(
	pollutant: "pm25" | "o3"
): Promise<XMap<string, MonitorLatestType<"pm25" | "o3">>> {
	const monitors = await getMonitors(pollutant);
	const latest = new XMap<string, MonitorLatestType<"pm25" | "o3">>();

	for (const monitor of monitors) {
		latest.set(monitor.id, monitor);
	}

	return latest;
}

export const monitorsManager = new MonitorsManager();
export type { MonitorsManager };
