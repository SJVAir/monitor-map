import { describe, expect, it } from "vitest";
import {
	applyPollutantSelection,
	asPollutant,
	currentSelection,
	parsePollutantParam
} from "$lib/options/pollutant-param";
import type { MonitorsPollutant } from "$lib/monitors/types";

function targets(pollutant: MonitorsPollutant | null, monitorsOn: boolean) {
	const manager = {
		pollutant,
		setPollutant(next: MonitorsPollutant) {
			manager.pollutant = next;
		}
	};
	return { manager, options: { monitorsOn } };
}

describe("parsePollutantParam", () => {
	it("accepts pm25, o3 and none", () => {
		expect(parsePollutantParam("pm25")).toBe("pm25");
		expect(parsePollutantParam("o3")).toBe("o3");
		expect(parsePollutantParam("none")).toBe("none");
	});

	it("rejects anything else", () => {
		for (const value of ["co", "PM25", "", "ozone", 1, true, undefined, null]) {
			expect(parsePollutantParam(value)).toBeNull();
		}
	});
});

describe("asPollutant", () => {
	it("is pm25 or o3, otherwise null", () => {
		expect(asPollutant("pm25")).toBe("pm25");
		expect(asPollutant("o3")).toBe("o3");
		expect(asPollutant("none")).toBeNull();
		expect(asPollutant("co")).toBeNull();
		expect(asPollutant(undefined)).toBeNull();
	});
});

describe("currentSelection", () => {
	it("is the pollutant while monitors are on", () => {
		expect(currentSelection("o3", true)).toBe("o3");
	});

	it("is none while monitors are off, whatever the pollutant", () => {
		expect(currentSelection("pm25", false)).toBe("none");
		expect(currentSelection(null, false)).toBe("none");
	});

	it("is null before a pollutant is known, or for one the menu doesn't offer", () => {
		expect(currentSelection(null, true)).toBeNull();
		expect(currentSelection("co", true)).toBeNull();
	});
});

describe("applyPollutantSelection", () => {
	it("none turns monitors off and keeps the last pollutant", () => {
		const t = targets("pm25", true);
		applyPollutantSelection("none", t);
		expect(t.manager.pollutant).toBe("pm25");
		expect(t.options.monitorsOn).toBe(false);
	});

	it("a pollutant sets it and turns monitors back on", () => {
		const t = targets("pm25", false);
		applyPollutantSelection("o3", t);
		expect(t.manager.pollutant).toBe("o3");
		expect(t.options.monitorsOn).toBe(true);
	});

	it("round-trips through currentSelection", () => {
		for (const selection of ["pm25", "o3", "none"] as const) {
			const t = targets("pm25", true);
			applyPollutantSelection(selection, t);
			expect(currentSelection(t.manager.pollutant, t.options.monitorsOn)).toBe(selection);
		}
	});
});
