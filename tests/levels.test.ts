import type { Scale } from "@sjvair/map-sdk/data";
import { describe, expect, it } from "vitest";
import { NEUTRAL_LEVEL_COLOR, readingLevel } from "../src/lib/levels.js";

const level = { opacity: null, tier: null, description: "", guidance: "", value: null };

const scale: Scale = {
	id: "test",
	label: "Test",
	units: "µg/m³",
	kind: "range",
	source: null,
	levels: [
		{ ...level, key: "good", label: "Good", min: 0, max: 9, color: "#00e400" },
		{ ...level, key: "moderate", label: "Moderate", min: 9, max: null, color: "#ffff00" }
	]
};

describe("readingLevel", () => {
	it("finds the level a numeric string falls in", () => {
		expect(readingLevel("4.9", scale)?.key).toBe("good");
	});

	it("treats levels as half-open", () => {
		expect(readingLevel(9, scale)?.key).toBe("moderate");
	});

	it("returns null for a value no level covers", () => {
		expect(readingLevel(-1, scale)).toBeNull();
	});

	it("returns null for a blank reading", () => {
		expect(readingLevel("", scale)).toBeNull();
	});

	it("returns null without a scale", () => {
		expect(readingLevel(5, null)).toBeNull();
	});

	it("exports the neutral color", () => {
		expect(NEUTRAL_LEVEL_COLOR).toBe("#969696");
	});
});
