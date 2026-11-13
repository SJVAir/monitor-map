import { beforeEach, describe, expect, it, vi } from "vitest";

type Mod = typeof import("$lib/options/option-values.svelte");
let m: Mod;

beforeEach(async () => {
	vi.resetModules();
	m = await import("$lib/options/option-values.svelte");
});

function targets() {
	return { manager: { setPollutant: vi.fn() }, basemap: { select: vi.fn() } };
}

describe("typeOn", () => {
	it("counts a missing type as on", () => {
		expect(m.typeOn({}, "newtype")).toBe(true);
		expect(m.typeOn({ "type:airnow": false }, "airnow")).toBe(false);
	});
});

describe("toolbarDefaults", () => {
	it("lets monitor-map's table win over the preset", () => {
		expect(m.toolbarDefaults({ inactive: true, "type:airnow": true, pollutant: "pm25" })).toEqual({
			"type:airnow": true,
			pollutant: "pm25",
			...m.MONITOR_MAP_DEFAULTS
		});
		expect(m.toolbarDefaults({ inactive: true }).inactive).toBe(false);
	});
});

describe("initMapOptions", () => {
	it("fills missing keys and keeps existing values", () => {
		m.mapOptions.wind = true;
		m.initMapOptions(m.MONITOR_MAP_DEFAULTS);
		expect(m.mapOptions.wind).toBe(true);
		expect(m.mapOptions.clustered).toBe(true);
	});
});

describe("applyOptionChange", () => {
	it("routes pollutant through the manager and monitorsOn", () => {
		const t = targets();
		m.applyOptionChange({ pollutant: "none" }, ["pollutant"], t);
		expect(m.monitorsDisplay.monitorsOn).toBe(false);
		expect(t.manager.setPollutant).not.toHaveBeenCalled();
		m.applyOptionChange({ pollutant: "o3" }, ["pollutant"], t);
		expect(t.manager.setPollutant).toHaveBeenCalledWith("o3");
		expect(m.monitorsDisplay.monitorsOn).toBe(true);
		expect("pollutant" in m.mapOptions).toBe(false);
	});

	it("ignores an invalid pollutant", () => {
		const t = targets();
		m.applyOptionChange({ pollutant: "co2" }, ["pollutant"], t);
		expect(t.manager.setPollutant).not.toHaveBeenCalled();
		expect(m.monitorsDisplay.monitorsOn).toBe(true);
	});

	it("selects and stores a changed basemap", () => {
		const t = targets();
		m.applyOptionChange({ basemap: "satellite" }, ["basemap"], t);
		expect(t.basemap.select).toHaveBeenCalledWith("satellite");
		expect(m.mapOptions.basemap).toBe("satellite");
	});

	it("writes every key of a reset-shaped change", () => {
		const t = targets();
		const next = { ...m.MONITOR_MAP_DEFAULTS, basemap: "streets", pollutant: "pm25" };
		m.applyOptionChange(next, Object.keys(next), t);
		for (const [key, value] of Object.entries(m.MONITOR_MAP_DEFAULTS)) {
			expect(m.mapOptions[key]).toBe(value);
		}
		expect(m.mapOptions.basemap).toBe("streets");
		expect(t.manager.setPollutant).toHaveBeenCalledWith("pm25");
	});
});

describe("toolbarValues", () => {
	it("maps the pollutant selection", () => {
		expect(m.toolbarValues("pm25", false, "pm25").pollutant).toBe("none");
		expect(m.toolbarValues(null, true, "pm25").pollutant).toBe("pm25");
	});
});

describe("bindBasemap", () => {
	it("resets the basemap on remount but keeps other values", () => {
		m.mapOptions.wind = true;
		m.mapOptions.basemap = "x";
		m.bindBasemap({ defaultId: "streets", onFallback: () => () => {} });
		expect(m.mapOptions.wind).toBe(true);
		expect(m.mapOptions.basemap).toBe("streets");
	});

	it("follows a fallback and returns the unsubscribe", () => {
		const off = vi.fn();
		let handler: (id: string) => void = () => {};
		const un = m.bindBasemap({
			defaultId: "satellite",
			onFallback: (h) => ((handler = h), off)
		});
		handler("streets");
		expect(m.mapOptions.basemap).toBe("streets");
		expect(un).toBe(off);
	});
});
