import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

// Lets every already-resolved promise chain run before the next assertion.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

let manager: MonitorsManager;
let flushSync: () => void;

beforeEach(async () => {
	sdk.getMonitorsList.mockReset().mockResolvedValue(LIST);
	sdk.getMonitorsMeta.mockReset().mockResolvedValue(META);
	sdk.getMonitors.mockReset().mockImplementation(async (pollutant: string) => readings(pollutant));

	// A fresh module per test: monitorsManager is a module-level singleton.
	vi.resetModules();
	manager = (await import("$lib/monitors/monitors.svelte.js")).monitorsManager;
	// Svelte is inlined in this project, so resetModules gave the manager a fresh copy of its
	// runtime too; a statically imported flushSync would flush the previous one.
	flushSync = (await import("svelte")).flushSync;
});

afterEach(() => {
	manager.autoUpdate.stop();
});

// These specs compile rune modules for the client (see vitest.config.ts), so the manager's
// constructor $effect really runs here; in tests/monitors it never does.
describe("monitorsManager's refetch effect", () => {
	it("does not refetch when init sets the pollutant", async () => {
		await manager.init("o3");
		flushSync();
		await flush();

		expect(sdk.getMonitorsList).toHaveBeenCalledTimes(1);
		expect(sdk.getMonitors.mock.calls).toEqual([["o3"]]);
		expect(manager.list).toEqual(LIST);
		expect(manager.latest?.get("a")).toEqual({ id: "a", pollutant: "o3" });
	});

	// Holds only because #runInit assigns the pollutant before it sets `initialized`: the effect
	// must never see the manager initialized with the pollutant it is about to replace.
	it("does not refetch when init replaces a pollutant set before it", async () => {
		manager.pollutant = "pm25";
		flushSync();

		await manager.init("o3");
		flushSync();
		await flush();

		expect(sdk.getMonitorsList).toHaveBeenCalledTimes(1);
		expect(sdk.getMonitors.mock.calls).toEqual([["o3"]]);
		expect(manager.list).toEqual(LIST);
	});

	it("refetches once when the pollutant changes after init", async () => {
		await manager.init();
		flushSync();
		sdk.getMonitorsList.mockClear();
		sdk.getMonitors.mockClear();

		manager.pollutant = "o3";
		flushSync();

		// Blanked at once, so markers are never colored with the previous pollutant's readings.
		expect(manager.list).toEqual([]);
		expect(manager.latest).toBeNull();

		await flush();
		flushSync();
		await flush();

		expect(sdk.getMonitorsList).toHaveBeenCalledTimes(1);
		expect(sdk.getMonitors.mock.calls).toEqual([["o3"]]);
		expect(manager.list).toEqual(LIST);
		expect(manager.latest?.get("a")).toEqual({ id: "a", pollutant: "o3" });
	});

	it("does not refetch when the pollutant is set to the value it already has", async () => {
		await manager.init();
		flushSync();
		sdk.getMonitorsList.mockClear();

		manager.pollutant = "pm25";
		flushSync();
		await flush();

		expect(sdk.getMonitorsList).not.toHaveBeenCalled();
	});
});
