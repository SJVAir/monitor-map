import { describe, expect, it } from "vitest";
import { MapStyle } from "@maptiler/sdk";
import { basemapChoices, monitorMapBasemaps, switchBasemap } from "$lib/map/basemaps";

describe("monitorMapBasemaps", () => {
	it("opens on Streets v4 and removes no layers", () => {
		const config = monitorMapBasemaps();
		expect(config.defaultId).toBe(MapStyle.STREETS_V4.getDefaultVariant().getId());
		expect(config.excludedLayers).toEqual([]);
		expect(config.styles.some((s) => s.id === config.defaultId)).toBe(true);
	});

	it("has no two styles with one id, and each style is a URL string", () => {
		const { styles } = monitorMapBasemaps();
		expect(new Set(styles.map((s) => s.id)).size).toBe(styles.length);
		expect(styles.every((s) => typeof s.style === "string")).toBe(true);
	});
});

describe("basemapChoices", () => {
	it("is sorted by name with one entry per style", () => {
		const names = basemapChoices().map((c) => c.name);
		expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
		expect(new Set(names).size).toBe(names.length);
		expect(names.filter((n) => n === "Streets")).toHaveLength(1);
	});

	it("lists each choice's variants with their type", () => {
		const streets = basemapChoices().find((c) => c.name === "Streets")!;
		expect(streets.variants.map((v) => v.type)).toEqual(["DEFAULT", "DARK", "PASTEL"]);
	});
});

describe("switchBasemap", () => {
	const dark = MapStyle.STREETS_V4.getVariant("DARK").getId();

	it("keeps the variant type when the new basemap has it", () => {
		expect(switchBasemap(dark, "Basic")).toBe(MapStyle.BASIC_V2.getVariant("DARK").getId());
	});

	it("falls back to the default variant when the new basemap lacks it", () => {
		expect(switchBasemap(dark, "Toner")).toBe(MapStyle.TONER_V2.getDefaultVariant().getId());
	});

	it("uses the default variant for an unknown current id", () => {
		expect(switchBasemap("nope", "Basic")).toBe(MapStyle.BASIC_V2.getDefaultVariant().getId());
	});
});
