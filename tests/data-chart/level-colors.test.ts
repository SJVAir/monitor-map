import type { Level, Scale } from "@sjvair/map-sdk/data";
import { describe, expect, it } from "vitest";
import { levelColors } from "$lib/data-chart/level-colors";

const base = { opacity: null, tier: null, description: "", guidance: "", value: null };

function level(key: string, min: number | null, color: string | null): Level {
	return { ...base, key, label: key, min, max: null, color };
}

function scale(levels: Level[]): Scale {
	return { id: "s", label: "S", units: "", kind: "range", source: null, levels };
}

describe("levelColors", () => {
	it("maps each level to its lower bound and its color without the leading #", () => {
		const s = scale([level("good", 0, "#00e400"), level("moderate", 9.1, "#ffff00")]);

		expect(levelColors(s)).toEqual([
			[0, "00e400"],
			[9.1, "ffff00"]
		]);
	});

	it("accepts a color that has no leading #", () => {
		expect(levelColors(scale([level("a", 0, "abcdef")]))).toEqual([[0, "abcdef"]]);
	});

	it("skips a level with no lower bound or no color", () => {
		const s = scale([level("a", null, "#111111"), level("b", 1, null), level("c", 2, "#222222")]);
		expect(levelColors(s)).toEqual([[2, "222222"]]);
	});

	it("returns nothing for no levels or no scale", () => {
		expect(levelColors(scale([]))).toEqual([]);
		expect(levelColors(null)).toEqual([]);
	});
});
