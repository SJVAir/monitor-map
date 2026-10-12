import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import type { MonitorsManager } from "$lib/monitors/monitors.svelte.js";

const sdk = vi.hoisted(() => ({
	getMonitors: vi.fn(),
	getMonitorsList: vi.fn(),
	getMonitorsMeta: vi.fn()
}));
vi.mock("@sjvair/sdk", () => sdk);

const LIST = [{ id: "a" }];
const META = { default_pollutant: "pm25" };
const readings = (pollutant: string) => [{ id: "a", pollutant }];

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

// Lets every already-resolved promise chain run before the next assertion.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

let manager: MonitorsManager;
let start: MockInstance;

beforeEach(async () => {
	sdk.getMonitorsList.mockReset().mockResolvedValue(LIST);
	sdk.getMonitorsMeta.mockReset().mockResolvedValue(META);
	sdk.getMonitors.mockReset().mockImplementation(async (pollutant: string) => readings(pollutant));

	// A fresh module per test: monitorsManager is a module-level singleton.
	vi.resetModules();
	manager = (await import("$lib/monitors/monitors.svelte.js")).monitorsManager;
	start = vi.spyOn(manager.autoUpdate, "start");
});

afterEach(() => {
	manager.autoUpdate.stop();
});

describe("monitorsManager.init", () => {
	it("shares one run between overlapping calls", async () => {
		const first = manager.init();
		const second = manager.init();

		expect(second).toBe(first);
		await Promise.all([first, second]);

		expect(sdk.getMonitorsList).toHaveBeenCalledTimes(1);
		expect(sdk.getMonitorsMeta).toHaveBeenCalledTimes(1);
		expect(sdk.getMonitors.mock.calls).toEqual([["pm25"]]);
		expect(start).toHaveBeenCalledTimes(1);
		expect(manager.initialized).toBe(true);
		expect(manager.list).toEqual(LIST);
		expect(manager.pollutant).toBe("pm25");
	});

	it("lets an explicit pollutant win over an earlier call without one", async () => {
		await Promise.all([manager.init(), manager.init("o3")]);

		expect(manager.pollutant).toBe("o3");
		expect(manager.latest?.get("a")).toEqual({ id: "a", pollutant: "o3" });
		expect(sdk.getMonitorsList).toHaveBeenCalledTimes(1);
		// It arrived before meta did, so the default pollutant's readings are never requested.
		expect(sdk.getMonitors.mock.calls).toEqual([["o3"]]);
	});

	it("lets an explicit pollutant win over a later call without one", async () => {
		await Promise.all([manager.init("o3"), manager.init()]);

		expect(manager.pollutant).toBe("o3");
		expect(sdk.getMonitors.mock.calls).toEqual([["o3"]]);
	});

	it("uses the most recent of two explicit pollutants", async () => {
		await Promise.all([manager.init("pm25"), manager.init("o3")]);

		expect(manager.pollutant).toBe("o3");
		expect(manager.latest?.get("a")).toEqual({ id: "a", pollutant: "o3" });
	});

	it("refetches once when an explicit pollutant arrives mid-run", async () => {
		const list = deferred<typeof LIST>();
		const defaultReadings = deferred<ReturnType<typeof readings>>();
		const explicitReadings = deferred<ReturnType<typeof readings>>();
		sdk.getMonitorsList.mockReturnValue(list.promise);
		sdk.getMonitors
			.mockReturnValueOnce(defaultReadings.promise)
			.mockReturnValueOnce(explicitReadings.promise);

		const run = manager.init();
		await flush();
		expect(sdk.getMonitors.mock.calls).toEqual([["pm25"]]);

		manager.init("o3");
		list.resolve(LIST);
		defaultReadings.resolve(readings("pm25"));
		await flush();

		expect(sdk.getMonitors.mock.calls).toEqual([["pm25"], ["o3"]]);
		expect(manager.initialized).toBe(false);

		explicitReadings.resolve(readings("o3"));
		await run;

		expect(manager.initialized).toBe(true);
		expect(manager.pollutant).toBe("o3");
		expect(manager.latest?.get("a")).toEqual({ id: "a", pollutant: "o3" });
		expect(sdk.getMonitorsList).toHaveBeenCalledTimes(1);
	});

	it("requests an explicit pollutant's readings without waiting for the list", async () => {
		const list = deferred<typeof LIST>();
		sdk.getMonitorsList.mockReturnValue(list.promise);

		const run = manager.init("o3");
		expect(sdk.getMonitors.mock.calls).toEqual([["o3"]]);

		list.resolve(LIST);
		await run;
	});

	it("requests the default pollutant's readings once meta arrives, without the list", async () => {
		const list = deferred<typeof LIST>();
		sdk.getMonitorsList.mockReturnValue(list.promise);

		const run = manager.init();
		await flush();
		expect(sdk.getMonitors.mock.calls).toEqual([["pm25"]]);
		expect(manager.initialized).toBe(false);

		list.resolve(LIST);
		await run;
		expect(manager.initialized).toBe(true);
	});

	it.each(["none", "pm10", true, 42, undefined])(
		"falls back to the default pollutant for %s",
		async (value) => {
			await manager.init(value);

			expect(manager.pollutant).toBe("pm25");
			expect(sdk.getMonitors.mock.calls).toEqual([["pm25"]]);
		}
	);

	it("can be retried after the list request fails", async () => {
		sdk.getMonitorsList.mockRejectedValueOnce(new Error("offline"));

		await expect(manager.init()).rejects.toThrow("offline");
		expect(manager.initialized).toBe(false);
		expect(start).not.toHaveBeenCalled();

		await manager.init();
		expect(manager.initialized).toBe(true);
		expect(sdk.getMonitorsList).toHaveBeenCalledTimes(2);
		expect(start).toHaveBeenCalledTimes(1);
	});

	it("can be retried after the latest-readings request fails", async () => {
		sdk.getMonitors.mockRejectedValueOnce(new Error("latest failed"));

		await expect(manager.init()).rejects.toThrow("latest failed");
		expect(manager.initialized).toBe(false);

		await manager.init();
		expect(manager.initialized).toBe(true);
	});

	it("rejects once when the list and the latest-readings requests both fail", async () => {
		sdk.getMonitorsList.mockRejectedValueOnce(new Error("list failed"));
		sdk.getMonitors.mockRejectedValueOnce(new Error("latest failed"));

		// Vitest fails the run on an unhandled rejection, so this also pins that neither is left
		// unhandled.
		await expect(manager.init("o3")).rejects.toThrow();
		await flush();

		expect(manager.initialized).toBe(false);
	});

	it("does not carry a failed run's pollutant into the retry", async () => {
		sdk.getMonitorsList.mockRejectedValueOnce(new Error("offline"));

		await expect(manager.init("o3")).rejects.toThrow("offline");
		await manager.init();

		expect(manager.pollutant).toBe("pm25");
	});

	it("does nothing once initialized", async () => {
		await manager.init();
		sdk.getMonitorsList.mockClear();
		sdk.getMonitorsMeta.mockClear();
		sdk.getMonitors.mockClear();

		await manager.init("o3");

		expect(sdk.getMonitorsList).not.toHaveBeenCalled();
		expect(sdk.getMonitorsMeta).not.toHaveBeenCalled();
		expect(sdk.getMonitors).not.toHaveBeenCalled();
		expect(manager.pollutant).toBe("pm25");
		expect(start).toHaveBeenCalledTimes(1);
	});

	it("does not start polling when asked not to", async () => {
		await manager.init(undefined, { autoUpdate: false });

		expect(manager.initialized).toBe(true);
		expect(start).not.toHaveBeenCalled();
		expect(manager.autoUpdate.isActive).toBe(false);
	});

	it.each([
		["first", [{ autoUpdate: false }, undefined]],
		["second", [undefined, { autoUpdate: false }]]
	] as const)(
		"starts polling when only the %s of two overlapping calls opts out",
		async (_which, [a, b]) => {
			await Promise.all([manager.init(undefined, a), manager.init(undefined, b)]);

			expect(start).toHaveBeenCalledTimes(1);
			expect(manager.autoUpdate.isActive).toBe(true);
		}
	);

	it("does not carry a failed run's polling request into the retry", async () => {
		sdk.getMonitorsList.mockRejectedValueOnce(new Error("offline"));

		await expect(manager.init()).rejects.toThrow("offline");
		await manager.init(undefined, { autoUpdate: false });

		expect(start).not.toHaveBeenCalled();
	});
});
describe("monitorsManager.resumeAutoUpdate", () => {
	it("does nothing before initialization", () => {
		manager.resumeAutoUpdate();

		expect(sdk.getMonitorsList).not.toHaveBeenCalled();
		expect(start).not.toHaveBeenCalled();
		expect(manager.autoUpdate.isActive).toBe(false);
	});

	it("does not refetch while polling is already active", async () => {
		await manager.init();
		sdk.getMonitorsList.mockClear();
		sdk.getMonitors.mockClear();

		manager.resumeAutoUpdate();
		await flush();

		expect(sdk.getMonitorsList).not.toHaveBeenCalled();
		expect(sdk.getMonitors).not.toHaveBeenCalled();
		expect(start).toHaveBeenCalledTimes(1);
	});

	it("refreshes once and starts polling after an init that opted out", async () => {
		await manager.init(undefined, { autoUpdate: false });
		sdk.getMonitorsList.mockClear();
		sdk.getMonitors.mockClear();

		manager.resumeAutoUpdate();
		await flush();

		expect(sdk.getMonitorsList).toHaveBeenCalledTimes(1);
		expect(sdk.getMonitors.mock.calls).toEqual([["pm25"]]);
		expect(manager.autoUpdate.isActive).toBe(true);
	});

	it("refreshes once and restarts polling after it was stopped", async () => {
		await manager.init("o3");
		manager.autoUpdate.stop();
		sdk.getMonitorsList.mockClear();
		sdk.getMonitors.mockClear();

		manager.resumeAutoUpdate();
		await flush();

		expect(sdk.getMonitorsList).toHaveBeenCalledTimes(1);
		expect(sdk.getMonitors.mock.calls).toEqual([["o3"]]);
		expect(manager.autoUpdate.isActive).toBe(true);
	});
});

describe("monitorsManager.update", () => {
	it("drops a response for a pollutant that is no longer selected", async () => {
		await manager.init();
		const stale = deferred<ReturnType<typeof readings>>();
		sdk.getMonitors.mockReturnValueOnce(stale.promise);

		const update = manager.update();
		manager.pollutant = "o3";
		manager.latest = null;
		stale.resolve(readings("pm25"));
		await update;

		expect(manager.latest).toBeNull();
	});

	it("applies a response for the pollutant that is still selected", async () => {
		await manager.init();
		sdk.getMonitorsList.mockResolvedValue([{ id: "a" }, { id: "b" }]);

		await manager.update();

		expect(manager.list).toEqual([{ id: "a" }, { id: "b" }]);
		expect(manager.latest?.get("a")).toEqual({ id: "a", pollutant: "pm25" });
	});
});
