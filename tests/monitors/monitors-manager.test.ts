import type { MonitorData } from "@sjvair/sdk";
import type { MonitorsStore } from "@sjvair/map-sdk/stores";
import { describe, expect, it, vi } from "vitest";
import { createMonitorsManager } from "../../src/lib/monitors/monitors.svelte.js";

/** A plain stand-in for map-sdk's monitors store: mutable fields, `vi.fn()` controls. */
function fakeStore() {
	return {
		initialized: false,
		entryType: null as string | null,
		meta: null,
		monitors: new Map<string, MonitorData>(),
		latest: new Map(),
		availableEntryTypes: [],
		dataSource: {} as MonitorsStore["dataSource"],
		init: vi.fn(async () => {}),
		entryTypeFor: vi.fn(),
		update: vi.fn(async () => {}),
		pauseAutoUpdate: vi.fn(),
		resumeAutoUpdate: vi.fn(),
		dispose: vi.fn()
	};
}

function setup() {
	const store = fakeStore();
	const manager = createMonitorsManager(store as unknown as MonitorsStore);
	return { store, manager };
}

describe("monitorsManager", () => {
	it("has no list until the store is initialized, then lists its monitors", () => {
		const { store, manager } = setup();
		const a = { id: "a" } as MonitorData;
		const b = { id: "b" } as MonitorData;
		store.monitors.set("a", a);
		store.monitors.set("b", b);
		expect(manager.list).toBeNull();
		expect(manager.initialized).toBe(false);

		store.initialized = true;
		expect(manager.initialized).toBe(true);
		expect(manager.list).toEqual([a, b]);
	});

	it("returns the same list between reads until the store's monitors are replaced", () => {
		const { store, manager } = setup();
		store.monitors.set("a", { id: "a" } as MonitorData);
		expect(manager.list).toBeNull();
		store.initialized = true;
		const first = manager.list;
		expect(manager.list).toBe(first);

		const c = { id: "c" } as MonitorData;
		store.monitors = new Map([["c", c]]);
		const second = manager.list;
		expect(second).not.toBe(first);
		expect(second).toEqual([c]);
		expect(manager.list).toBe(second);
	});

	it("passes pm25 and o3 through to the store's init with the options", async () => {
		const { store, manager } = setup();
		await manager.init("pm25", { autoUpdate: false });
		expect(store.init).toHaveBeenLastCalledWith("pm25", { autoUpdate: false });
		await manager.init("o3");
		expect(store.init).toHaveBeenLastCalledWith("o3", undefined);
	});

	it.each(["none", true, 7, undefined])("drops %s as the init pollutant", async (pollutant) => {
		const { store, manager } = setup();
		const signal = new AbortController().signal;
		await manager.init(pollutant, { signal });
		expect(store.init).toHaveBeenLastCalledWith(undefined, { signal });
	});

	it("sets the pollutant through the store and reads it back from the store", () => {
		const { store, manager } = setup();
		manager.setPollutant("o3");
		expect(store.entryTypeFor).toHaveBeenCalledWith("o3");
		expect(manager.pollutant).toBeNull();
		store.entryType = "o3";
		expect(manager.pollutant).toBe("o3");
	});

	it("reads meta from the store and forwards the polling controls", async () => {
		const { store, manager } = setup();
		expect(manager.meta).toBeNull();
		const meta = {} as never;
		(store as { meta: unknown }).meta = meta;
		expect(manager.meta).toBe(meta);
		expect(manager.store).toBe(store);

		const signal = new AbortController().signal;
		await manager.update({ signal });
		expect(store.update).toHaveBeenCalledWith({ signal });
		manager.pauseAutoUpdate();
		expect(store.pauseAutoUpdate).toHaveBeenCalledOnce();
		manager.resumeAutoUpdate();
		expect(store.resumeAutoUpdate).toHaveBeenCalledOnce();
	});
});
