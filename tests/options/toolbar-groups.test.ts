import { describe, expect, it } from "vitest";
import type { MonitorsOptions, MonitorsOptionsInput, OptionsPreset } from "@sjvair/map-sdk";
import type { MonitorsMeta } from "@sjvair/sdk";
import {
	buildToolbar,
	mapPollutants,
	monitorTypes,
	type ToolbarIcons
} from "$lib/options/toolbar-groups";
import { MONITOR_MAP_DEFAULTS } from "$lib/options/option-values.svelte";

const icon = { svg: "<svg/>" };
const icons: ToolbarIcons = {
	monitors: icon,
	pm25: icon,
	o3: icon,
	none: icon,
	collocation: icon,
	layers: icon,
	fireAndSmoke: icon,
	evStations: icon,
	overlays: icon,
	wind: icon,
	settings: icon,
	clusters: icon,
	basemap: icon,
	theme: icon,
	reset: icon,
	evLevel2: icon,
	evLevel3: icon
};

const labels = {
	purpleair: "PurpleAir",
	airnow: "AirNow",
	bam1022: "BAM 1022",
	aqview: "AQview",
	aqlite: "AQLite"
};

function fakeMonitors() {
	const calls: MonitorsOptionsInput[] = [];
	const monitors: MonitorsOptions = {
		groups(input) {
			calls.push(input);
			return {
				groups: [
					{ id: "pollutant", label: "PM2.5", rows: [] },
					{ id: "monitors", label: "Monitors", rows: [] }
				],
				defaults: { pollutant: "pm25", "type:airnow": true }
			};
		}
	};
	return { monitors, calls };
}

const settings: OptionsPreset = {
	groups: [{ id: "settings", label: "Settings", rows: [] }],
	defaults: { basemap: "streets" }
};
const hms = {
	row: { kind: "checkbox" as const, id: "fireAndSmoke", label: "Fire & Smoke" },
	defaults: { fireAndSmoke: true }
};
const meta = {
	monitors: {},
	available_pollutants: ["o3", "pm25", "pm10"],
	default_pollutant: "o3"
} as unknown as MonitorsMeta;

function build(m: MonitorsMeta | null, selection: string | null = "pm25") {
	const fake = fakeMonitors();
	const toolbar = buildToolbar({
		monitors: fake.monitors,
		settings,
		hms,
		meta: m,
		selection,
		layersLabel: "Layers",
		overlaysLabel: "Overlays",
		icons
	});
	return { ...fake, toolbar };
}

describe("monitorTypes", () => {
	it("sorts the type keys by label", () => {
		const m = {
			monitors: Object.fromEntries(Object.entries(labels).map(([k, label]) => [k, { label }]))
		};
		expect(monitorTypes(m)).toEqual(["airnow", "aqlite", "aqview", "bam1022", "purpleair"]);
	});
	it("is empty without meta", () => {
		expect(monitorTypes(null)).toEqual([]);
	});
});

describe("mapPollutants", () => {
	it("keeps pm25 and o3 in that order", () => {
		expect(mapPollutants({ available_pollutants: ["o3", "pm25", "pm10"] })).toEqual(["pm25", "o3"]);
	});
	it("is empty without meta", () => {
		expect(mapPollutants(null)).toEqual([]);
	});
});

describe("buildToolbar", () => {
	it("builds five groups without meta and leaves pollutant out of defaults", () => {
		const { toolbar } = build(null);
		expect(toolbar.groups).toHaveLength(5);
		expect("pollutant" in toolbar.defaults).toBe(false);
	});

	it("passes the monitors input", () => {
		const { calls } = build(meta, "none");
		expect(calls[0]).toMatchObject({
			pollutants: ["pm25", "o3"],
			pollutant: null,
			defaultPollutant: "o3",
			hasInactive: true,
			hasInside: true,
			collocation: true,
			none: true
		});
	});

	it("orders groups and clusters", () => {
		const { toolbar } = build(meta);
		expect(toolbar.groups.map((g) => g.id)).toEqual([
			"pollutant",
			"monitors",
			"layers",
			"overlays",
			"settings"
		]);
		expect(toolbar.groups.map((g) => g.cluster)).toEqual([
			"monitors",
			"monitors",
			"options",
			"options",
			"options"
		]);
		expect(toolbar.groups[3].align).toBe("end");
	});

	it("puts the Fire & Smoke row first in Layers as map-sdk built it", () => {
		const layers = build(meta).toolbar.groups[2];
		expect(layers.rows[0]).toBe(hms.row);
	});

	it("nests the EV levels under EV Chargers", () => {
		const layers = build(meta).toolbar.groups[2];
		const ev = layers.rows[1];
		expect(ev.kind === "checkbox" && ev.children?.map((c) => c.id)).toEqual(["ev:lvl2", "ev:lvl3"]);
	});

	it("includes monitor-map's defaults and the preset's", () => {
		const { defaults } = build(meta).toolbar;
		expect(defaults).toMatchObject(MONITOR_MAP_DEFAULTS);
		expect(defaults.pollutant).toBe("pm25");
		expect(defaults["type:airnow"]).toBe(true);
	});
});
