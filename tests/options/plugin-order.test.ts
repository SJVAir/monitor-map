import { describe, expect, it } from "vitest";
import { beforeId, DRAW_ORDER, wantedPlugins } from "$lib/options/plugin-order";
import type { OptionValues } from "@sjvair/map-sdk";
import { MONITOR_MAP_DEFAULTS } from "$lib/options/option-values.svelte.js";

function options(overrides: OptionValues = {}): OptionValues {
	return { ...MONITOR_MAP_DEFAULTS, ...overrides };
}

describe("DRAW_ORDER", () => {
	it("lists the plugins bottom to top", () => {
		expect([...DRAW_ORDER]).toEqual([
			"wind",
			"hms-smoke",
			"hms-fire",
			"collocation-sites",
			"monitors",
			"ev-l2",
			"ev-l3"
		]);
	});
});

describe("beforeId", () => {
	it("is the first present plugin above the key", () => {
		expect(beforeId("hms-smoke", new Set(["monitors", "wind"]))).toBe("monitors");
		expect(beforeId("wind", new Set(["hms-fire", "monitors"]))).toBe("hms-fire");
	});

	it("is undefined when nothing above is present", () => {
		expect(beforeId("ev-l3", new Set(["monitors"]))).toBeUndefined();
		expect(beforeId("monitors", new Set(["wind", "hms-smoke"]))).toBeUndefined();
	});
});

describe("wantedPlugins", () => {
	it("is smoke, fire and monitors with the defaults", () => {
		expect(wantedPlugins(options(), true, "pm25")).toEqual(
			new Set(["hms-smoke", "hms-fire", "monitors"])
		);
	});

	it("draws collocation sites only for PM2.5 while monitors are on", () => {
		const on = options({ collocationSites: true });
		expect(wantedPlugins(on, true, "pm25").has("collocation-sites")).toBe(true);
		expect(wantedPlugins(on, true, "o3").has("collocation-sites")).toBe(false);
		const off = wantedPlugins(on, false, "pm25");
		expect(off.has("collocation-sites")).toBe(false);
		expect(off.has("monitors")).toBe(false);
	});

	it("draws each EV level that is on while EV chargers are on", () => {
		const wanted = wantedPlugins(options({ evStations: true, "ev:lvl3": false }), true, "pm25");
		expect(wanted.has("ev-l2")).toBe(true);
		expect(wanted.has("ev-l3")).toBe(false);
		const off = wantedPlugins(options({ evStations: false }), true, "pm25");
		expect(off.has("ev-l2") || off.has("ev-l3")).toBe(false);
	});

	it("drops both HMS plugins with Fire & Smoke off", () => {
		const wanted = wantedPlugins(options({ fireAndSmoke: false }), true, "pm25");
		expect(wanted.has("hms-smoke") || wanted.has("hms-fire")).toBe(false);
	});

	it("adds wind while it is on", () => {
		expect(wantedPlugins(options({ wind: true }), true, "pm25").has("wind")).toBe(true);
	});
});
