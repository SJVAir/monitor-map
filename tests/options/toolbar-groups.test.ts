import { describe, expect, it } from "vitest";
import type { MonitorsMeta } from "@sjvair/sdk";
import {
	buildToolbar,
	mapPollutants,
	monitorTypes,
	type ToolbarIcons
} from "$lib/options/toolbar-groups";
import type {
	MonitorsOptions,
	MonitorsOptionsInput,
	OptionCheckbox,
	OptionsPreset
} from "@sjvair/map-sdk";

// A distinct icon per key, so a test can tell which one landed where.
const iconKeys = [
	"monitors",
	"pm25",
	"o3",
	"none",
	"collocation",
	"layers",
	"fireAndSmoke",
	"evStations",
	"overlays",
	"wind",
	"settings",
	"clusters",
	"basemap",
	"theme",
	"reset",
	"evLevel2",
	"evLevel3"
] as const;
const icons = Object.fromEntries(
	iconKeys.map((k) => [k, { svg: `<svg data-icon="${k}"/>` }])
) as unknown as ToolbarIcons;

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

	it("passes the monitors icons", () => {
		const { calls } = build(meta);
		expect(calls[0].icons).toEqual({
			monitors: icons.monitors,
			pollutant: { pm25: icons.pm25, o3: icons.o3 },
			none: icons.none,
			collocation: icons.collocation
		});
	});

	it("labels the Layers and Overlays groups with the labels passed, and their icons", () => {
		const [, , layers, overlays] = build(meta).toolbar.groups;
		expect(layers.label).toBe("Layers");
		expect(layers.icon).toBe(icons.layers);
		expect(overlays.label).toBe("Overlays");
		expect(overlays.icon).toBe(icons.overlays);
	});

	it("puts Fire & Smoke, then EV Chargers with its levels, in Layers", () => {
		const layers = build(meta).toolbar.groups[2];
		expect(layers.rows).toHaveLength(2);
		const ev = layers.rows[1] as OptionCheckbox;
		expect(ev).toMatchObject({
			kind: "checkbox",
			id: "evStations",
			label: "EV Chargers",
			icon: icons.evStations
		});
		expect(ev.children).toEqual([
			{ kind: "checkbox", id: "ev:lvl2", label: "Level 2", icon: icons.evLevel2 },
			{ kind: "checkbox", id: "ev:lvl3", label: "Level 3", icon: icons.evLevel3 }
		]);
	});

	it("puts Wind in Overlays", () => {
		const overlays = build(meta).toolbar.groups[3];
		expect(overlays.rows).toEqual([
			{ kind: "checkbox", id: "wind", label: "Wind", icon: icons.wind }
		]);
	});

	it("adds monitor-map's rows' defaults to the presets'", () => {
		const { defaults } = build(meta).toolbar;
		expect(defaults).toEqual({
			pollutant: "pm25",
			"type:airnow": true,
			fireAndSmoke: true,
			basemap: "streets",
			evStations: false,
			"ev:lvl2": true,
			"ev:lvl3": true,
			wind: false
		});
	});
});
