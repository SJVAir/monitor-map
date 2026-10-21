import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

const sdk = vi.hoisted(() => ({ getCollocationSites: vi.fn() }));
const hms = vi.hoisted(() => ({ getHMSSmoke: vi.fn(), getHMSFire: vi.fn() }));
vi.mock("@sjvair/sdk", () => sdk);
vi.mock("@sjvair/sdk/hms", () => hms);

// Settles like the real SDK: rejects with the signal's reason once it aborts.
function hangUntilAborted(options?: { signal?: AbortSignal }) {
	return new Promise<never>((_, reject) => {
		const signal = options?.signal;
		if (!signal) return;
		if (signal.aborted) return reject(signal.reason);
		signal.addEventListener("abort", () => reject(signal.reason), { once: true });
	});
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const reason = new Error("cancelled");
const abortedSignal = () => {
	const controller = new AbortController();
	controller.abort(reason);
	return controller.signal;
};

let errorLog: MockInstance;

beforeEach(() => {
	vi.resetModules();
	sdk.getCollocationSites.mockReset();
	hms.getHMSSmoke.mockReset();
	hms.getHMSFire.mockReset();
	errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("collocationSitesManager", () => {
	const load = async () =>
		(await import("$lib/collocation-sites/collocations.svelte.js")).collocationSitesManager;

	it("passes the signal to getCollocationSites from init and update", async () => {
		sdk.getCollocationSites.mockResolvedValue([{ id: "a" }]);
		const manager = await load();
		const controller = new AbortController();
		await manager.init({ signal: controller.signal });
		await manager.update({ signal: controller.signal });
		expect(sdk.getCollocationSites).toHaveBeenNthCalledWith(1, { signal: controller.signal });
		expect(sdk.getCollocationSites).toHaveBeenNthCalledWith(2, { signal: controller.signal });
	});

	it("rejects an aborted init with the reason, stays uninitialized, and logs nothing", async () => {
		sdk.getCollocationSites.mockImplementation(hangUntilAborted);
		const manager = await load();
		const controller = new AbortController();
		const run = manager.init({ signal: controller.signal });
		controller.abort(reason);
		await expect(run).rejects.toBe(reason);
		expect(manager.initialized).toBe(false);
		expect(errorLog).not.toHaveBeenCalled();

		sdk.getCollocationSites.mockReset().mockResolvedValue([{ id: "a" }]);
		await manager.init();
		expect(manager.initialized).toBe(true);
		expect(manager.collocationSites).toEqual([{ id: "a" }]);
	});

	it("rejects with the reason and sends nothing when the signal is already aborted", async () => {
		sdk.getCollocationSites.mockResolvedValue([]);
		const manager = await load();
		await expect(manager.init({ signal: abortedSignal() })).rejects.toBe(reason);
		expect(manager.initialized).toBe(false);
		expect(sdk.getCollocationSites).not.toHaveBeenCalled();
		expect(errorLog).not.toHaveBeenCalled();
	});

	it("rejects an aborted update with the reason", async () => {
		sdk.getCollocationSites.mockResolvedValue([{ id: "a" }]);
		const manager = await load();
		await manager.init();
		sdk.getCollocationSites.mockImplementation(hangUntilAborted);
		const controller = new AbortController();
		const run = manager.update({ signal: controller.signal });
		controller.abort(reason);
		await expect(run).rejects.toBe(reason);
		expect(manager.collocationSites).toEqual([{ id: "a" }]);
		expect(errorLog).not.toHaveBeenCalled();
	});

	it("behaves as before without a signal", async () => {
		sdk.getCollocationSites.mockResolvedValue([{ id: "a" }]);
		const manager = await load();
		await manager.init();
		expect(manager.initialized).toBe(true);
		expect(sdk.getCollocationSites).toHaveBeenCalledWith({ signal: undefined });
	});
});

describe("hmsManager", () => {
	const load = async () => (await import("$lib/hms/hms.svelte.js")).hmsManager;

	it("passes the signal to getHMSSmoke and getHMSFire", async () => {
		hms.getHMSSmoke.mockResolvedValue([]);
		hms.getHMSFire.mockResolvedValue([]);
		const manager = await load();
		const controller = new AbortController();
		await manager.init({ signal: controller.signal });
		expect(hms.getHMSSmoke).toHaveBeenCalledWith({ signal: controller.signal });
		expect(hms.getHMSFire).toHaveBeenCalledWith({ signal: controller.signal });
		await manager.loadSmoke({ signal: controller.signal });
		await manager.loadFire({ signal: controller.signal });
		expect(hms.getHMSSmoke).toHaveBeenCalledTimes(2);
		expect(hms.getHMSFire).toHaveBeenCalledTimes(2);
	});

	it("rejects an aborted init with the reason and logs nothing", async () => {
		hms.getHMSSmoke.mockImplementation(hangUntilAborted);
		hms.getHMSFire.mockImplementation(hangUntilAborted);
		const manager = await load();
		const controller = new AbortController();
		const run = manager.init({ signal: controller.signal });
		controller.abort(reason);
		await expect(run).rejects.toBe(reason);
		expect(errorLog).not.toHaveBeenCalled();
	});

	it("rejects with the reason and logs nothing when the signal is already aborted", async () => {
		hms.getHMSSmoke.mockImplementation(hangUntilAborted);
		hms.getHMSFire.mockImplementation(hangUntilAborted);
		const manager = await load();
		await expect(manager.init({ signal: abortedSignal() })).rejects.toBe(reason);
		expect(errorLog).not.toHaveBeenCalled();
	});

	it("rejects an aborted loadSmoke and loadFire without logging", async () => {
		hms.getHMSSmoke.mockImplementation(hangUntilAborted);
		hms.getHMSFire.mockImplementation(hangUntilAborted);
		const manager = await load();
		const controller = new AbortController();
		const smoke = manager.loadSmoke({ signal: controller.signal });
		const fire = manager.loadFire({ signal: controller.signal });
		controller.abort(reason);
		await expect(smoke).rejects.toBe(reason);
		await expect(fire).rejects.toBe(reason);
		expect(errorLog).not.toHaveBeenCalled();
	});

	it("still logs and resolves loadFire on a non-abort error, with or without a signal", async () => {
		const failure = new Error("500");
		hms.getHMSFire.mockRejectedValue(failure);
		const manager = await load();
		await expect(manager.loadFire()).resolves.toBeUndefined();
		await expect(
			manager.loadFire({ signal: new AbortController().signal })
		).resolves.toBeUndefined();
		expect(errorLog).toHaveBeenCalledTimes(2);
	});

	it("still rejects loadSmoke on a non-abort error", async () => {
		const failure = new Error("500");
		hms.getHMSSmoke.mockRejectedValue(failure);
		const manager = await load();
		await expect(manager.loadSmoke()).rejects.toBe(failure);
	});

	it("init resolves on non-abort failures, even with a live signal", async () => {
		hms.getHMSSmoke.mockRejectedValue(new Error("500"));
		hms.getHMSFire.mockResolvedValue([]);
		const manager = await load();
		await expect(manager.init({ signal: new AbortController().signal })).resolves.toBeUndefined();
		await flush();
	});
});

describe("evStationsManager", () => {
	const load = async () =>
		(await import("$lib/ev-stations/ev-stations.svelte.js")).evStationsManager;
	const okFetch = () =>
		vi.fn().mockResolvedValue({ json: async () => ({ fuel_stations: [{ id: 1 }] }) });

	beforeEach(() => {
		vi.stubEnv("VITE_NREL_KEY", "test-key");
	});

	it("passes the signal to fetch for both levels", async () => {
		const fetchMock = okFetch();
		vi.stubGlobal("fetch", fetchMock);
		const manager = await load();
		const controller = new AbortController();
		await manager.loadLvl2Stations({ signal: controller.signal });
		await manager.loadLvl3Stations({ signal: controller.signal });
		expect(fetchMock).toHaveBeenCalledTimes(2);
		for (const call of fetchMock.mock.calls) {
			expect(call[1]).toEqual({ signal: controller.signal });
		}
		expect(manager.lvl2Stations).toEqual([{ id: 1 }]);
		expect(manager.lvl3Stations).toEqual([{ id: 1 }]);
	});

	it("rejects an aborted load with the reason and logs nothing", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn((_url: unknown, init?: { signal?: AbortSignal }) => hangUntilAborted(init))
		);
		const manager = await load();
		const controller = new AbortController();
		const run = manager.loadLvl2Stations({ signal: controller.signal });
		controller.abort(reason);
		await expect(run).rejects.toBe(reason);
		expect(manager.lvl2Stations).toBeUndefined();
		expect(errorLog).not.toHaveBeenCalled();
	});

	it("rejects with the reason and sends nothing when the signal is already aborted", async () => {
		const fetchMock = okFetch();
		vi.stubGlobal("fetch", fetchMock);
		const manager = await load();
		await expect(manager.loadLvl3Stations({ signal: abortedSignal() })).rejects.toBe(reason);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(errorLog).not.toHaveBeenCalled();
	});

	it("behaves as before without a signal", async () => {
		const fetchMock = okFetch();
		vi.stubGlobal("fetch", fetchMock);
		const manager = await load();
		await manager.loadLvl2Stations();
		expect(manager.lvl2Stations).toEqual([{ id: 1 }]);
	});
});
