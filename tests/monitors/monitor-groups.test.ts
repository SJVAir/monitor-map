import { describe, expect, it } from "vitest";
import {
	LOW_COST_TYPES,
	REFERENCE_GRADE_TYPES,
	typeSupportsPollutant
} from "$lib/monitors/monitor-groups";

const meta = {
	monitors: {
		purpleair: { entries: { pm25: {}, temperature: {} } },
		vozbox: { entries: { o3: {} } }
	}
};

describe("monitor groups", () => {
	it("splits types into reference-grade and low-cost by vendor", () => {
		expect([...REFERENCE_GRADE_TYPES]).toEqual(["airnow", "aqlite", "aqview", "bam1022"]);
		expect([...LOW_COST_TYPES]).toEqual(["airgradient", "purpleair", "vozbox"]);
	});
});

describe("typeSupportsPollutant", () => {
	it("is true when the type has an entry for the pollutant", () => {
		expect(typeSupportsPollutant(meta, "purpleair", "pm25")).toBe(true);
		expect(typeSupportsPollutant(meta, "vozbox", "o3")).toBe(true);
	});

	it("is false when the type lacks the pollutant", () => {
		expect(typeSupportsPollutant(meta, "purpleair", "o3")).toBe(false);
	});

	it("is false for unknown types, missing meta, or no pollutant", () => {
		expect(typeSupportsPollutant(meta, "airnow", "pm25")).toBe(false);
		expect(typeSupportsPollutant(null, "purpleair", "pm25")).toBe(false);
		expect(typeSupportsPollutant(meta, "purpleair", null)).toBe(false);
	});
});
