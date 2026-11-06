import { beforeEach, describe, expect, it, vi } from "vitest";

const setPollutant = vi.fn();
vi.mock("$lib/monitors/monitors.svelte.js", () => ({ monitorsManager: { setPollutant } }));

const { MAP_OPTION_DEFAULTS } = await import("$lib/options/map-option-defaults");
const { mapOptions, resetMapOptions } = await import("$lib/options/map-options.svelte.js");

function flip() {
	mapOptions.monitorsOn = false;
	for (const key of Object.keys(mapOptions.monitorTypes)) mapOptions.monitorTypes[key] = false;
	mapOptions.inactive = true;
	mapOptions.inside = true;
	mapOptions.clustered = false;
	mapOptions.collocationSites = true;
	mapOptions.fireAndSmoke = false;
	mapOptions.evStations = true;
	mapOptions.evLevels.lvl2 = false;
	mapOptions.evLevels.lvl3 = false;
	mapOptions.wind = true;
}

describe("resetMapOptions", () => {
	beforeEach(() => {
		setPollutant.mockClear();
		flip();
	});

	it("starts at the defaults", async () => {
		vi.resetModules();
		const fresh = await import("$lib/options/map-options.svelte.js");
		expect({ ...fresh.mapOptions }).toEqual({ ...MAP_OPTION_DEFAULTS, monitorsOn: true });
	});

	it("restores every option to its default", () => {
		resetMapOptions("pm25");
		expect({ ...mapOptions }).toEqual({ ...MAP_OPTION_DEFAULTS, monitorsOn: true });
		expect(MAP_OPTION_DEFAULTS.monitorTypes).toEqual({
			airnow: true,
			aqlite: true,
			aqview: true,
			bam1022: true,
			airgradient: true,
			purpleair: true,
			vozbox: true
		});
		expect(setPollutant).toHaveBeenCalledExactlyOnceWith("pm25");
	});

	it("leaves the defaults themselves untouched", () => {
		resetMapOptions("pm25");
		mapOptions.monitorTypes.airnow = false;
		mapOptions.evLevels.lvl2 = false;
		expect(MAP_OPTION_DEFAULTS.monitorTypes.airnow).toBe(true);
		expect(MAP_OPTION_DEFAULTS.evLevels.lvl2).toBe(true);
	});

	it("turns monitors on without changing the pollutant when meta isn't loaded", () => {
		resetMapOptions(null);
		expect(mapOptions.monitorsOn).toBe(true);
		expect(setPollutant).not.toHaveBeenCalled();
	});
});
