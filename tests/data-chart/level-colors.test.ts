import { describe, expect, it } from "vitest";
import { levelColors } from "$lib/data-chart/level-colors";

describe("levelColors", () => {
	it("maps each level to its lower bound and its color without the leading #", () => {
		const levels = [
			{ range: [0, 9], color: "#00e400" },
			{ range: [9.1, 35.4], color: "#ffff00" }
		];

		expect(levelColors(levels)).toEqual([
			[0, "00e400"],
			[9.1, "ffff00"]
		]);
	});

	it("accepts a color that has no leading #", () => {
		expect(levelColors([{ range: [0, 1], color: "abcdef" }])).toEqual([[0, "abcdef"]]);
	});

	it("returns nothing for no levels", () => {
		expect(levelColors([])).toEqual([]);
	});
});
