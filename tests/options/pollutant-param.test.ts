import { describe, expect, it } from "vitest";
import {
	applyPollutantSelection,
	currentSelection,
	parsePollutantParam
} from "$lib/options/pollutant-param";
import type { MonitorsPollutant } from "$lib/monitors/types";

function targets(pollutant: MonitorsPollutant | null, enabled: boolean) {
	return { manager: { pollutant }, integration: { enabled } };
}

describe("parsePollutantParam", () => {
	it("accepts pm25, o3 and none", () => {
		expect(parsePollutantParam("pm25")).toBe("pm25");
		expect(parsePollutantParam("o3")).toBe("o3");
		expect(parsePollutantParam("none")).toBe("none");
	});

	it("rejects anything else", () => {
		for (const value of ["PM25", "", "ozone", 1, true, undefined, null]) {
			expect(parsePollutantParam(value)).toBeNull();
		}
	});
});

describe("currentSelection", () => {
	it("is the pollutant while monitors are enabled", () => {
		expect(currentSelection("o3", true)).toBe("o3");
	});

	it("is none while monitors are disabled, whatever the pollutant", () => {
		expect(currentSelection("pm25", false)).toBe("none");
		expect(currentSelection(null, false)).toBe("none");
	});

	it("is null before a pollutant is known", () => {
		expect(currentSelection(null, true)).toBeNull();
	});
});

describe("applyPollutantSelection", () => {
	it("none disables monitors and keeps the last pollutant", () => {
		const t = targets("pm25", true);
		applyPollutantSelection("none", t);
		expect(t).toEqual(targets("pm25", false));
	});

	it("a pollutant sets it and re-enables monitors", () => {
		const t = targets("pm25", false);
		applyPollutantSelection("o3", t);
		expect(t).toEqual(targets("o3", true));
	});

	it("round-trips through currentSelection", () => {
		for (const selection of ["pm25", "o3", "none"] as const) {
			const t = targets("pm25", true);
			applyPollutantSelection(selection, t);
			expect(currentSelection(t.manager.pollutant, t.integration.enabled)).toBe(selection);
		}
	});
});
