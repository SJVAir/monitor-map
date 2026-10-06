import { describe, expect, it } from "vitest";
import { getTypeShape } from "$lib/monitors/monitor-utils";

describe("getTypeShape", () => {
	it("renders every low-cost type as a circle, including all PurpleAirs", () => {
		for (const type of ["airgradient", "purpleair", "vozbox"]) {
			expect(getTypeShape(type)).toBe("circle");
		}
	});

	it("renders reference-grade types as triangles", () => {
		for (const type of ["airnow", "aqlite", "aqview", "bam1022"]) {
			expect(getTypeShape(type)).toBe("triangle");
		}
	});
});
