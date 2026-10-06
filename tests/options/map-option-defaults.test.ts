import { describe, expect, it, vi } from "vitest";
import { applyMapOptionDefaults, type MapOptionTargets } from "$lib/options/map-option-defaults";

function flippedTargets(): MapOptionTargets {
	const opt = (value: boolean) => ({ value });
	return {
		manager: { pollutant: "o3" },
		integration: {
			enabled: false,
			clustered: false,
			displayOptions: {
				airnow: opt(false),
				aqlite: opt(false),
				aqview: opt(false),
				bam1022: opt(false),
				airgradient: opt(false),
				purpleair: opt(false),
				vozbox: opt(false),
				inactive: opt(true),
				inside: opt(true)
			}
		},
		collocationSites: { enabled: true },
		hmsFire: { enabled: false },
		hmsSmoke: { enabled: false },
		evStations: {
			enabled: true,
			clustered: false,
			displayOptions: { lvl2: opt(false), lvl3: opt(false) }
		},
		wind: { enabled: true },
		mapStyle: { reset: vi.fn() }
	};
}

describe("applyMapOptionDefaults", () => {
	it("restores every option to its default", () => {
		const t = flippedTargets();
		applyMapOptionDefaults(t, "pm25");

		expect(t.manager.pollutant).toBe("pm25");
		expect(t.integration.enabled).toBe(true);
		expect(t.integration.clustered).toBe(true);
		const values = Object.fromEntries(
			Object.entries(t.integration.displayOptions).map(([key, o]) => [key, o.value])
		);
		expect(values).toEqual({
			airnow: true,
			aqlite: true,
			aqview: true,
			bam1022: true,
			airgradient: true,
			purpleair: true,
			vozbox: true,
			inactive: false,
			inside: false
		});
		expect(t.collocationSites.enabled).toBe(false);
		expect(t.hmsFire.enabled).toBe(true);
		expect(t.hmsSmoke.enabled).toBe(true);
		expect(t.evStations.enabled).toBe(false);
		expect(t.evStations.clustered).toBe(true);
		expect(t.evStations.displayOptions.lvl2.value).toBe(true);
		expect(t.evStations.displayOptions.lvl3.value).toBe(true);
		expect(t.wind.enabled).toBe(false);
		expect(t.mapStyle.reset).toHaveBeenCalledOnce();
	});

	it("re-enables monitors without changing the pollutant when meta isn't loaded", () => {
		const t = flippedTargets();
		applyMapOptionDefaults(t, null);
		expect(t.manager.pollutant).toBe("o3");
		expect(t.integration.enabled).toBe(true);
	});
});
