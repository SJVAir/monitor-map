import { describe, expect, it } from "vitest";
import type { Feature, FeatureCollection, Point } from "geojson";
import type { DataSource, MonitorFeatureProperties } from "@sjvair/map-sdk/data";
import { filteredMonitors } from "$lib/monitors/filtered-source.svelte.js";
import type { OptionValues } from "@sjvair/map-sdk";

// The toolbar's defaults (map-sdk's presets plus monitor-map's rows), as a fixture.
const DEFAULTS: OptionValues = {
	inactive: false,
	inside: false,
	collocationSites: false,
	clustered: true,
	fireAndSmoke: true,
	evStations: false,
	"ev:lvl2": true,
	"ev:lvl3": true,
	wind: false
};

function feature(
	id: string,
	type: string,
	isActive: boolean,
	location: "inside" | "outside"
): Feature<Point, MonitorFeatureProperties> {
	return {
		type: "Feature",
		geometry: { type: "Point", coordinates: [0, 0] },
		properties: { refKey: id, name: id, value: 1, type, isActive, isSjvair: false, location }
	};
}

const collection: FeatureCollection<Point, MonitorFeatureProperties> = {
	type: "FeatureCollection",
	features: [
		feature("a", "purpleair", true, "outside"),
		feature("b", "airnow", false, "outside"),
		feature("c", "purpleair", true, "inside"),
		feature("d", "newtype", true, "outside")
	]
};

const status = { state: "ready" } as const;
const scale = { dataset: "air-quality", entryType: "pm25" };
const source = { status, features: collection, scale } as DataSource<MonitorFeatureProperties>;

function ids(options: OptionValues): string[] {
	return (filteredMonitors(source, options).features?.features ?? []).map(
		(f) => f.properties.refKey
	);
}

describe("filteredMonitors", () => {
	it("shows active outside monitors with the defaults", () => {
		expect(ids(DEFAULTS)).toEqual(["a", "d"]);
	});

	it("adds inactive monitors when Inactive is on", () => {
		expect(ids({ ...DEFAULTS, inactive: true })).toEqual(["a", "b", "d"]);
	});

	it("adds inside monitors when Inside is on", () => {
		expect(ids({ ...DEFAULTS, inside: true })).toEqual(["a", "c", "d"]);
	});

	it("drops a type that is off", () => {
		const values = { ...DEFAULTS, "type:purpleair": false };
		expect(ids({ ...values, inactive: true, inside: true })).toEqual(["b", "d"]);
	});

	it("shows a type with no key and hides it when its key is false", () => {
		expect(ids(DEFAULTS)).toContain("d");
		expect(ids({ ...DEFAULTS, "type:newtype": false })).toEqual(["a"]);
	});

	it("passes status and scale through", () => {
		const filtered = filteredMonitors(source, DEFAULTS);
		expect(filtered.status).toBe(status);
		expect(filtered.scale).toBe(scale);
	});

	it("has no features while the source has none", () => {
		const empty = { status, features: null, scale } as DataSource<MonitorFeatureProperties>;
		expect(filteredMonitors(empty, DEFAULTS).features).toBeNull();
	});
});
