import type { FeatureCollection, Point } from "geojson";
import {
	encodeRef,
	type DataSource,
	type DataStatus,
	type MapFeatureProperties
} from "@sjvair/map-sdk/data";
import { fetchEvStations } from "./ev-stations";
import type { EvStation } from "./types";

export type EvLevel = "lvl2" | "lvl3";

/** A charger on the map: `name` is the station's name; chargers have no value. */
export interface EvFeatureProperties extends MapFeatureProperties {
	level: EvLevel;
}

export type FetchEvStations = (level: EvLevel, signal?: AbortSignal) => Promise<EvStation[]>;

export interface EvStore {
	/** One level's chargers for its plugin; `loading` until the first `load(level)`. */
	dataSource(level: EvLevel): DataSource<EvFeatureProperties>;
	/**
	 * Fetches a level once; overlapping calls share the run. A failure sets the status to `error`
	 * (its `retry()` fetches again) and rejects.
	 */
	load(level: EvLevel): Promise<void>;
	/** A loaded station by id, from either level. */
	station(id: string): EvStation | undefined;
}

/** NREL has this station in the wrong place, so it is left out (as in 4.x). */
const DROPPED_STATION = 226154;

function toFeatures(
	stations: EvStation[],
	level: EvLevel
): FeatureCollection<Point, EvFeatureProperties> {
	return {
		type: "FeatureCollection",
		features: stations.map((station) => ({
			type: "Feature",
			properties: {
				refKey: encodeRef({ kind: "feature", id: String(station.id) }),
				name: station.station_name ?? "",
				value: null,
				level
			},
			geometry: { type: "Point", coordinates: [station.longitude, station.latitude] }
		}))
	};
}

class EvLevelSource implements DataSource<EvFeatureProperties> {
	status: DataStatus = $state.raw({ state: "loading" });
	features: FeatureCollection<Point, EvFeatureProperties> | null = $state.raw(null);
	readonly scale = null;
	stations: EvStation[] = [];

	#run: Promise<void> | null = null;
	#loaded = false;

	constructor(
		private level: EvLevel,
		private fetchStations: FetchEvStations
	) {}

	load(): Promise<void> {
		if (this.#loaded) return Promise.resolve();
		this.#run ??= this.#fetch();
		return this.#run;
	}

	async #fetch(): Promise<void> {
		if (this.status.state !== "loading") this.status = { state: "loading" };
		try {
			const stations = (await this.fetchStations(this.level)).filter(
				(station) => station.id !== DROPPED_STATION
			);
			this.stations = stations;
			this.features = toFeatures(stations, this.level);
			this.status = { state: "ready" };
			this.#loaded = true;
		} catch (error) {
			this.features = null;
			this.status = {
				state: "error",
				error,
				retry: () => {
					this.load().catch(() => {});
				}
			};
			throw error;
		} finally {
			this.#run = null;
		}
	}
}

/** EV chargers by level, each fetched when first wanted. */
export function createEvStore(fetchStations: FetchEvStations = fetchEvStations): EvStore {
	const levels = {
		lvl2: new EvLevelSource("lvl2", fetchStations),
		lvl3: new EvLevelSource("lvl3", fetchStations)
	};
	return {
		dataSource: (level) => levels[level],
		load: (level) => levels[level].load(),
		station(id) {
			for (const source of Object.values(levels)) {
				const found = source.stations.find((station) => String(station.id) === id);
				if (found) return found;
			}
			return undefined;
		}
	};
}
