import { describe, expect, it } from "vitest";
import { parseToRgba } from "color2k";
import {
	blocksBackground,
	fireSmokeLegendSections,
	gradientBackground,
	pollutantLegendSection,
	swatchOverWhite,
	tickPosition
} from "$lib/legend/legend-data";

const level = (color: string, start: number, end: number) => ({
	color,
	range: [start, end] as [number, number]
});

describe("pollutantLegendSection", () => {
	it("builds a PM2.5 gradient with floored range starts as ticks", () => {
		const section = pollutantLegendSection("pm25", [
			level("#00e400", 0, 9),
			level("#ffff00", 9.1, 35.4),
			level("#ff7e00", 35.5, 55.4),
			level("#ff0000", 55.5, 150.4),
			level("#8f3f97", 150.5, 250.4),
			level("#7e0023", 250.5, 500.4)
		]);
		expect(section).toEqual({
			id: "pollutant",
			title: "PM2.5",
			unit: "µg/m³",
			bar: {
				kind: "gradient",
				colors: ["#00e400", "#ffff00", "#ff7e00", "#ff0000", "#8f3f97", "#7e0023"],
				ticks: ["0", "9", "35", "55", "150", "250"]
			}
		});
	});

	it("handles ozone's five levels with no Moderate", () => {
		const section = pollutantLegendSection("o3", [
			level("#00e400", 0, 124.9),
			level("#ff7e00", 125, 164.9),
			level("#ff0000", 165, 204.9),
			level("#8f3f97", 205, 404.9),
			level("#7e0023", 405, 604.9)
		]);
		expect(section?.title).toBe("Ozone");
		expect(section?.unit).toBe("ppb");
		expect(section?.bar).toEqual({
			kind: "gradient",
			colors: ["#00e400", "#ff7e00", "#ff0000", "#8f3f97", "#7e0023"],
			ticks: ["0", "125", "165", "205", "405"]
		});
	});

	it("returns null when there are no levels", () => {
		expect(pollutantLegendSection("pm25", [])).toBeNull();
	});
});

describe("gradientBackground", () => {
	it("joins colors into a left-to-right gradient", () => {
		expect(gradientBackground(["red", "lime", "blue"])).toBe(
			"linear-gradient(to right, red, lime, blue)"
		);
	});

	it("returns a plain color for a single stop (a 1-stop linear-gradient is invalid CSS)", () => {
		expect(gradientBackground(["red"])).toBe("red");
	});

	it("returns none for no colors", () => {
		expect(gradientBackground([])).toBe("none");
	});
});

describe("blocksBackground", () => {
	it("builds hard-edged equal-width blocks", () => {
		expect(blocksBackground(["red", "blue"])).toBe(
			"linear-gradient(to right, red 0.00%, red 50.00%, blue 50.00%, blue 100.00%)"
		);
	});

	it("returns none for no colors", () => {
		expect(blocksBackground([])).toBe("none");
	});
});

describe("tickPosition", () => {
	it("spreads ticks evenly from 0 to 100 percent", () => {
		expect(tickPosition(0, 6)).toBe(0);
		expect(tickPosition(5, 6)).toBe(100);
		expect(tickPosition(2, 5)).toBe(50);
	});

	it("puts a lone tick at 0", () => {
		expect(tickPosition(0, 1)).toBe(0);
	});
});

describe("swatchOverWhite", () => {
	it("mixes a color toward white by its layer opacity", () => {
		expect(parseToRgba(swatchOverWhite("#000000", 0.4))).toEqual([153, 153, 153, 1]);
	});

	it("is white at zero opacity", () => {
		expect(parseToRgba(swatchOverWhite("#000000", 0))).toEqual([255, 255, 255, 1]);
	});
});

describe("fireSmokeLegendSections", () => {
	it("builds a Fire section and a Smoke Density section with blended swatches", () => {
		const sections = fireSmokeLegendSections(
			[
				{ color: "#FFD700", label: "<10" },
				{ color: "#8B0000", label: "≥350" }
			],
			[{ label: "Heavy", color: "#000000", opacity: 0.4 }]
		);
		expect(sections.map((s) => s.id)).toEqual(["fire", "smoke"]);
		expect(sections[0]).toEqual({
			id: "fire",
			title: "Fire",
			unit: "MW",
			bar: {
				kind: "blocks",
				categories: [
					{ color: "#FFD700", label: "<10" },
					{ color: "#8B0000", label: "≥350" }
				]
			}
		});
		const smoke = sections[1].bar;
		expect(smoke.kind).toBe("blocks");
		if (smoke.kind !== "blocks") return;
		expect(smoke.categories[0].label).toBe("Heavy");
		expect(parseToRgba(smoke.categories[0].color)).toEqual([153, 153, 153, 1]);
	});
});
