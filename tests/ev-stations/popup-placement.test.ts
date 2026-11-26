import { describe, expect, it } from "vitest";
import { popupAnchor, shiftInto } from "../../src/lib/ev-stations/popup-placement.js";

const bounds = { top: 60, right: 399, bottom: 811, left: 12 };

describe("popupAnchor", () => {
	it("opens below a station in the upper part of the free area", () => {
		expect(popupAnchor(200, bounds)).toBe("top");
	});

	it("opens above a station in the lower part of the free area", () => {
		expect(popupAnchor(600, bounds)).toBe("bottom");
	});
});

describe("shiftInto", () => {
	it("leaves a box that fits where it is", () => {
		expect(shiftInto({ top: 100, right: 300, bottom: 300, left: 20 }, bounds)).toEqual([0, 0]);
	});

	it("moves a box off the left edge right by its overflow", () => {
		// The Tuolumne Meadows case: 56 px off the left of a phone.
		expect(shiftInto({ top: 100, right: 284, bottom: 300, left: -56 }, bounds)).toEqual([68, 0]);
	});

	it("moves a box off the right edge left by its overflow", () => {
		expect(shiftInto({ top: 100, right: 474, bottom: 300, left: 124 }, bounds)).toEqual([-75, 0]);
	});

	it("moves a box under the toolbar down and one past the bottom up", () => {
		expect(shiftInto({ top: 20, right: 300, bottom: 200, left: 20 }, bounds)).toEqual([0, 40]);
		expect(shiftInto({ top: 700, right: 300, bottom: 900, left: 20 }, bounds)).toEqual([0, -89]);
	});

	it("keeps the start edge of a box bigger than the free area in view", () => {
		expect(shiftInto({ top: 0, right: 300, bottom: 1000, left: 20 }, bounds)).toEqual([0, 60]);
	});
});
