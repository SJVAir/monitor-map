import { describe, expect, it } from "vitest";
import { variantForStyle } from "$lib/map/basemap";

function fakeStyle(types: Array<string>) {
	const variants = new Map(types.map((type) => [type, { getType: () => type }]));
	return {
		variants,
		hasVariant: (type: string) => variants.has(type),
		getVariant: (type: string) => variants.get(type)!,
		getDefaultVariant: () => variants.get("DEFAULT")!
	};
}

describe("variantForStyle", () => {
	it("keeps the same variant type when the new basemap has it", () => {
		const style = fakeStyle(["DEFAULT", "DARK", "PASTEL"]);
		expect(variantForStyle(style, { getType: () => "DARK" })).toBe(style.variants.get("DARK"));
	});

	it("falls back to the default variant when the new basemap lacks it", () => {
		const toner = fakeStyle(["DEFAULT", "LITE", "LINES"]);
		expect(variantForStyle(toner, { getType: () => "DARK" })).toBe(toner.variants.get("DEFAULT"));
	});

	it("uses the default variant when there is no previous variant", () => {
		const style = fakeStyle(["DEFAULT", "DARK"]);
		expect(variantForStyle(style, null)).toBe(style.variants.get("DEFAULT"));
	});
});
