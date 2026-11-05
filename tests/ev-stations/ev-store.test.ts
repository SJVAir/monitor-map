import { describe, expect, it, vi } from "vitest";
import { createEvStore } from "../../src/lib/ev-stations/ev-store.svelte.js";
import type { EvStation } from "../../src/lib/ev-stations/types";

function station(id: number, name = `Station ${id}`): EvStation {
	return { id, station_name: name, latitude: 36.7, longitude: -119.8 } as EvStation;
}

describe("createEvStore", () => {
	it("is loading until the level is loaded", () => {
		const store = createEvStore(vi.fn());
		expect(store.dataSource("lvl2").status.state).toBe("loading");
		expect(store.dataSource("lvl2").features).toBeNull();
		expect(store.dataSource("lvl2").scale).toBeNull();
	});

	it("fetches a level once", async () => {
		const fetchStations = vi.fn().mockResolvedValue([station(1)]);
		const store = createEvStore(fetchStations);
		await Promise.all([store.load("lvl2"), store.load("lvl2")]);
		await store.load("lvl2");
		expect(fetchStations).toHaveBeenCalledTimes(1);
		expect(fetchStations).toHaveBeenCalledWith("lvl2");
		expect(store.dataSource("lvl2").status.state).toBe("ready");
		expect(store.dataSource("lvl3").status.state).toBe("loading");
	});

	it("keeps each level's stations apart", async () => {
		const fetchStations = vi.fn(async (level: string) =>
			level === "lvl2" ? [station(1)] : [station(2)]
		);
		const store = createEvStore(fetchStations);
		await store.load("lvl2");
		await store.load("lvl3");
		expect(store.dataSource("lvl2").features!.features.map((f) => f.properties.refKey)).toEqual([
			"feature:1"
		]);
		expect(store.dataSource("lvl3").features!.features.map((f) => f.properties.level)).toEqual([
			"lvl3"
		]);
	});

	it("sets an error with a retry when the fetch fails", async () => {
		const fetchStations = vi
			.fn()
			.mockRejectedValueOnce(new Error("blocked"))
			.mockResolvedValueOnce([station(1)]);
		const store = createEvStore(fetchStations);
		await expect(store.load("lvl2")).rejects.toThrow("blocked");
		const status = store.dataSource("lvl2").status;
		expect(status.state).toBe("error");
		expect(store.dataSource("lvl2").features).toBeNull();
		if (status.state !== "error") throw new Error("unreachable");
		status.retry();
		await vi.waitFor(() => expect(store.dataSource("lvl2").status.state).toBe("ready"));
		expect(fetchStations).toHaveBeenCalledTimes(2);
		expect(store.dataSource("lvl2").features!.features).toHaveLength(1);
	});

	it("drops station 226154", async () => {
		const store = createEvStore(vi.fn().mockResolvedValue([station(226154), station(7)]));
		await store.load("lvl3");
		expect(store.dataSource("lvl3").features!.features.map((f) => f.properties.refKey)).toEqual([
			"feature:7"
		]);
		expect(store.station("226154")).toBeUndefined();
	});

	it("builds point features with refKey, name, value and level", async () => {
		const store = createEvStore(vi.fn().mockResolvedValue([station(42, "City Hall")]));
		await store.load("lvl2");
		const [feature] = store.dataSource("lvl2").features!.features;
		expect(feature.properties).toEqual({
			refKey: "feature:42",
			name: "City Hall",
			value: null,
			level: "lvl2"
		});
		expect(feature.geometry).toEqual({ type: "Point", coordinates: [-119.8, 36.7] });
		expect(store.station("42")?.station_name).toBe("City Hall");
	});
});
