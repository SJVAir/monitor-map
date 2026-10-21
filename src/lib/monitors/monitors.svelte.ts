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
import { anySignal, untilAborted, type SignalOptions } from "$lib/abort";
import type { MonitorsDataSource, MonitorsPollutant } from "./types";

export interface MonitorsInitOptions {
	/**
	 * Start the 2-minute polling once the initial load finishes. Defaults to true; pass false to
	 * load the data without showing a map (`resumeAutoUpdate()` starts polling later).
	 */
	autoUpdate?: boolean;
	/**
	 * Stops waiting: the returned promise rejects with the signal's reason. The shared run keeps
	 * going for the other calls waiting on it, and is cancelled only when every call waiting on it
	 * passed a signal and all of those aborted. An aborted call's pollutant and `autoUpdate` stay
	 * recorded. Ignored once initialized.
	 */
	signal?: AbortSignal;
}

/** One shared init run and the calls waiting on it. */
interface InitRun {
	promise: Promise<void>;
	controller: AbortController;
	/** Calls waiting with a signal, and how many of those aborted. */
	signalled: number;
	aborted: number;
	/** Whether any call waits without a signal, which keeps the run going. */
	unsignalled: boolean;
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

	#initRun: InitRun | null = null;
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

		const { signal } = options;
		// Nothing is recorded or started for a call that is already cancelled.
		if (signal?.aborted) return Promise.reject(signal.reason);

		if (options.autoUpdate !== false) this.#requestedAutoUpdate = true;

		if (urlPollutant === "pm25" || urlPollutant === "o3") {
			this.#requestedPollutant = urlPollutant;
		}

		const run = (this.#initRun ??= this.#startInitRun());

		if (!signal) {
			run.unsignalled = true;
			return run.promise;
		}

		run.signalled++;
		const onAbort = () => {
			run.aborted++;
			if (!run.unsignalled && run.aborted === run.signalled) this.#abortInitRun(run);
		};
		signal.addEventListener("abort", onAbort, { once: true });
		const cleanup = () => signal.removeEventListener("abort", onAbort);
		run.promise.then(cleanup, cleanup);

		return untilAborted(run.promise, signal);
	}

	#startInitRun(): InitRun {
		const controller = new AbortController();
		const run: InitRun = {
			promise: this.#runInit(controller.signal).finally(() => {
				if (this.#initRun === run) this.#clearInitRun();
			}),
			controller,
			signalled: 0,
			aborted: 0,
			unsignalled: false
		};
		return run;
	}

	/**
	 * Cancels a run nobody is waiting on. It is detached at once, so a call arriving before its
	 * rejection settles starts a fresh run instead of joining the cancelled one.
	 */
	#abortInitRun(run: InitRun): void {
		if (this.#initRun !== run) return;
		this.#clearInitRun();
		run.controller.abort();
	}

	#clearInitRun(): void {
		this.#initRun = null;
		this.#requestedPollutant = null;
		this.#requestedAutoUpdate = false;
	}

	async #runInit(signal: AbortSignal): Promise<void> {
		// The pollutant the latest readings were requested for.
		let fetchedPollutant = this.#requestedPollutant;

		const metaRequest = getMonitorsMeta({ signal });
		const listAndMeta = Promise.all([getMonitorsList({ signal }), metaRequest]).then(
			([list, meta]) => {
				if (signal.aborted) throw signal.reason;
				this.list = list;
				this.meta = meta;
				return meta;
			}
		);
		// The latest readings only need the pollutant, so they never wait for the list. An explicit
		// pollutant may still arrive before meta does, in which case the default is never fetched.
		const latestRequest = fetchedPollutant
			? getMonitorsLatestMap(fetchedPollutant, signal)
			: metaRequest.then((meta) => {
					const pollutant = this.#requestedPollutant ?? meta.default_pollutant;
					fetchedPollutant = pollutant;
					return getMonitorsLatestMap(pollutant, signal);
				});

		// One Promise.all so a failure in either never leaves the other unhandled.
		const [meta, firstLatest] = await Promise.all([listAndMeta, latestRequest]);
		let latest = firstLatest;

		// An explicit pollutant may have arrived while the requests above were in flight.
		let wanted = this.#requestedPollutant ?? meta.default_pollutant;
		while (wanted !== fetchedPollutant) {
			latest = await getMonitorsLatestMap(wanted, signal);
			fetchedPollutant = wanted;
			wanted = this.#requestedPollutant ?? meta.default_pollutant;
		}

		// Cancelled while a request that ignores the signal was settling: leave state to the next run.
		if (signal.aborted) throw signal.reason;

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

		// Set once callerAborted has run, so the catch below does not run it a second time.
		let abortedError: unknown;

		try {
			const pollutant = this.pollutant;
			const [list, latest] = await Promise.all([
				getMonitorsList({ signal: combined.signal }),
				getMonitorsLatestMap(pollutant || this.meta?.default_pollutant || "pm25", combined.signal)
			]);

			// Superseded or cancelled while the requests were settling.
			if (options.signal?.aborted) throw (abortedError = callerAborted(options.signal));
			if (controller.signal.aborted) return;

			// The pollutant changed while this was in flight: these readings belong to the previous
			// one, and the change has already started its own update.
			if (this.pollutant !== pollutant) return;

			this.list = list;
			this.latest = latest;
		} catch (error) {
			// The caller's own abort rejects with its reason. A superseded update resolves quietly.
			if (options.signal?.aborted)
				throw error === abortedError ? error : callerAborted(options.signal);
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
