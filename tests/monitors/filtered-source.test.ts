import { describe, expect, it } from "vitest";
import type { Feature, FeatureCollection, Point } from "geojson";
import type { DataSource, MonitorFeatureProperties } from "@sjvair/map-sdk/data";
import { filteredMonitors } from "$lib/monitors/filtered-source.svelte.js";
import { defaultMapOptions, type MapOptions } from "$lib/options/map-option-defaults";

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
		feature("c", "purpleair", true, "inside")
	]
};

const status = { state: "ready" } as const;
const scale = { dataset: "air-quality", entryType: "pm25" };
const source = { status, features: collection, scale } as DataSource<MonitorFeatureProperties>;

function ids(options: MapOptions): string[] {
	return (filteredMonitors(source, options).features?.features ?? []).map(
		(f) => f.properties.refKey
	);
}

describe("filteredMonitors", () => {
	it("shows active outside monitors with the defaults", () => {
		expect(ids(defaultMapOptions())).toEqual(["a"]);
	});

	it("adds inactive monitors when Inactive is on", () => {
		expect(ids({ ...defaultMapOptions(), inactive: true })).toEqual(["a", "b"]);
	});

	it("adds inside monitors when Inside is on", () => {
		expect(ids({ ...defaultMapOptions(), inside: true })).toEqual(["a", "c"]);
	});

	it("drops a type that is off", () => {
		const options = defaultMapOptions();
		options.monitorTypes.purpleair = false;
		expect(ids({ ...options, inactive: true, inside: true })).toEqual(["b"]);
	});

	it("drops a type with no option", () => {
		const options = defaultMapOptions();
		delete options.monitorTypes.airnow;
		expect(ids({ ...options, inactive: true })).toEqual(["a"]);
	});

	it("passes status and scale through", () => {
		const filtered = filteredMonitors(source, defaultMapOptions());
		expect(filtered.status).toBe(status);
		expect(filtered.scale).toBe(scale);
	});

	it("has no features while the source has none", () => {
		const empty = { status, features: null, scale } as DataSource<MonitorFeatureProperties>;
		expect(filteredMonitors(empty, defaultMapOptions()).features).toBeNull();
	});
});
