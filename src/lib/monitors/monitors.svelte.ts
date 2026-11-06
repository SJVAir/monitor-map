import type { MonitorData, MonitorsMeta } from "@sjvair/sdk";
import type { MonitorsStore } from "@sjvair/map-sdk/stores";
import { monitorsStore } from "../stores.svelte.js";

export interface MonitorsInitOptions {
	/**
	 * Start the 2-minute polling once the initial load finishes. Defaults to true; pass false to
	 * load the data without showing a map (`resumeAutoUpdate()` starts polling later).
	 */
	autoUpdate?: boolean;
	/**
	 * Stops waiting: the returned promise rejects with the signal's reason. The shared run keeps
	 * going for the other calls waiting on it, and is cancelled only when every call waiting on it
	 * passed a signal and all of those aborted. Ignored once initialized.
	 */
	signal?: AbortSignal;
}

/**
 * The live monitors data, as hosts have used it since 4.x: a thin view over map-sdk's monitors
 * store, which owns the data, the shared init and the polling.
 */
export interface MonitorsManager {
	/** Loads the monitors. Only "pm25" and "o3" pass through; anything else means the default. */
	init(pollutant?: unknown, options?: MonitorsInitOptions): Promise<void>;
	readonly initialized: boolean;
	readonly meta: MonitorsMeta | null;
	/**
	 * Every monitor, or null until initialized. The same array between reads until the store's
	 * monitors are replaced.
	 */
	readonly list: MonitorData[] | null;
	/** The pollutant the readings are for, or null before init. */
	readonly pollutant: string | null;
	setPollutant(pollutant: "pm25" | "o3"): void;
	update(options?: { signal?: AbortSignal }): Promise<void>;
	resumeAutoUpdate(): void;
	pauseAutoUpdate(): void;
	/** The store underneath, for map-sdk plugins and stores. */
	readonly store: MonitorsStore;
}

function initPollutant(pollutant: unknown): "pm25" | "o3" | undefined {
	return pollutant === "pm25" || pollutant === "o3" ? pollutant : undefined;
}

export function createMonitorsManager(store: MonitorsStore): MonitorsManager {
	// The list built from `store.monitors`, which the store replaces rather than mutates.
	let listFrom: MonitorsStore["monitors"] | null = null;
	let list: MonitorData[] = [];
	return {
		init: (pollutant, options) => store.init(initPollutant(pollutant), options),
		get initialized() {
			return store.initialized;
		},
		get meta() {
			return store.meta;
		},
		get list() {
			if (!store.initialized) return null;
			const monitors = store.monitors;
			if (monitors !== listFrom) {
				listFrom = monitors;
				list = [...monitors.values()];
			}
			return list;
		},
		get pollutant() {
			return store.entryType;
		},
		setPollutant: (pollutant) => store.entryTypeFor(pollutant),
		update: (options) => store.update(options),
		resumeAutoUpdate: () => store.resumeAutoUpdate(),
		pauseAutoUpdate: () => store.pauseAutoUpdate(),
		store
	};
}

export const monitorsManager: MonitorsManager = createMonitorsManager(monitorsStore);
