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
import { anySignal, type SignalOptions } from "../abort";
import type { MonitorsDataSource, MonitorsPollutant } from "./types";

export interface MonitorsInitOptions {
	/**
	 * Start the 2-minute polling once the initial load finishes. Defaults to true; pass false to
	 * load the data without showing a map (`resumeAutoUpdate()` starts polling later).
	 */
	autoUpdate?: boolean;
}

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
	#requestedAutoUpdate = false;
	#updateController: AbortController | null = null;

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
	 * between two explicit values the most recent wins. Polling starts when the run finishes
	 * unless every call sharing it passed `autoUpdate: false`. A no-op once initialized, so it
	 * never restarts polling either: that is `resumeAutoUpdate()`.
	 */
	init(urlPollutant?: string | number | boolean, options: MonitorsInitOptions = {}): Promise<void> {
		if (this.initialized) return Promise.resolve();

		if (options.autoUpdate !== false) this.#requestedAutoUpdate = true;

		if (urlPollutant === "pm25" || urlPollutant === "o3") {
			this.#requestedPollutant = urlPollutant;
		}

		this.#initPromise ??= this.#runInit().finally(() => {
			this.#initPromise = null;
			this.#requestedPollutant = null;
			this.#requestedAutoUpdate = false;
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
		// The latest readings only need the pollutant, so they never wait for the list. An explicit
		// pollutant may still arrive before meta does, in which case the default is never fetched.
		const latestRequest = fetchedPollutant
			? getMonitorsLatestMap(fetchedPollutant)
			: metaRequest.then((meta) => {
					const pollutant = this.#requestedPollutant ?? meta.default_pollutant;
					fetchedPollutant = pollutant;
					return getMonitorsLatestMap(pollutant);
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
		if (this.#requestedAutoUpdate) this.autoUpdate.start();
		this.initialized = true;
	}

	/**
	 * Starts polling when it is not running: after something stopped it (MonitorMapLayout stops
	 * it on destroy) or after an init that opted out of it. Refreshes first since the data may
	 * be stale. A no-op before init or while polling.
	 */
	resumeAutoUpdate(): void {
		if (!this.initialized || this.autoUpdate.isActive) return;

		this.update().catch(console.error);
		this.autoUpdate.start();
	}

	/**
	 * Refreshes the list and the latest readings. Starting an update aborts the previous
	 * in-flight one, which then resolves without touching state. Pass `signal` to cancel from the
	 * outside: that rejects with the signal's reason.
	 */
	async update(options: SignalOptions = {}): Promise<void> {
		if (!this.initialized) return;

		// Nothing has started yet, so an in-flight update is left alone.
		if (options.signal?.aborted) throw options.signal.reason;

		const supersededInFlight = this.#updateController !== null;
		this.#updateController?.abort();
		const controller = new AbortController();
		this.#updateController = controller;
		const combined = anySignal(controller.signal, options.signal);

		// The caller cancelled this update. If it is still the latest and it cut off an update that
		// was in flight, that update's data is lost too, so refresh again without a signal.
		const callerAborted = (signal: AbortSignal) => {
			if (supersededInFlight && this.#updateController === controller) {
				this.update().catch(console.error);
			}
			return signal.reason;
		};

		try {
			const pollutant = this.pollutant;
			const [list, latest] = await Promise.all([
				getMonitorsList({ signal: combined.signal }),
				getMonitorsLatestMap(pollutant || this.meta?.default_pollutant || "pm25", combined.signal)
			]);

			// Superseded or cancelled while the requests were settling.
			if (options.signal?.aborted) throw callerAborted(options.signal);
			if (controller.signal.aborted) return;

			// The pollutant changed while this was in flight: these readings belong to the previous
			// one, and the change has already started its own update.
			if (this.pollutant !== pollutant) return;

			this.list = list;
			this.latest = latest;
		} catch (error) {
			// The caller's own abort rejects with its reason. A superseded update resolves quietly.
			if (options.signal?.aborted) throw callerAborted(options.signal);
			if (controller.signal.aborted) return;
			throw error;
		} finally {
			combined.dispose();
			if (this.#updateController === controller) this.#updateController = null;
		}
	}
}

async function getMonitorsLatestMap(
	pollutant: "pm25" | "o3",
	signal?: AbortSignal
): Promise<XMap<string, MonitorLatestType<"pm25" | "o3">>> {
	const monitors = await getMonitors(pollutant, undefined, { signal });
	const latest = new XMap<string, MonitorLatestType<"pm25" | "o3">>();

	for (const monitor of monitors) {
		latest.set(monitor.id, monitor);
	}

	return latest;
}

export const monitorsManager = new MonitorsManager();
export type { MonitorsManager };
