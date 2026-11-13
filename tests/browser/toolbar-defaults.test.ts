import { expect, it } from "vitest";
import { hmsOptions, monitorsOptions, settingsGroup, type MapContext } from "@sjvair/map-sdk";
import type { MonitorsMeta } from "@sjvair/sdk";
import { buildToolbar, type ToolbarIcons } from "$lib/options/toolbar-groups";

// In the browser project because map-sdk's main entry (its presets) loads the map engine's CSS,
// which Node can't import.

const icon = { svg: "<svg/>" };
const icons = new Proxy({}, { get: () => icon }) as ToolbarIcons;

const answer = <T>(value: T) => Promise.resolve(value);
const map = {
	messages: (key: string) => key,
	metadata: {
		scale: () => answer("unavailable"),
		attribution: () => answer("unavailable"),
		entryType: () => answer("unavailable"),
		entryTypeHelp: () => answer("unavailable"),
		monitorTypeLabel: () => answer("unavailable"),
		monitorGroups: () => answer([]),
		monitorTypeGroup: () => answer("unavailable"),
		monitorTypeReports: () => answer(true)
	},
	basemap: {
		styles: [
			{ id: "streets", style: "", basemap: "Streets", name: "Default", isDefault: true },
			{ id: "satellite", style: "", basemap: "Satellite" }
		],
		defaultId: "streets",
		current: "streets",
		select: () => {},
		onFallback: () => () => {}
	}
} as unknown as MapContext;

const meta = {
	monitors: { purpleair: { label: "PurpleAir" }, airnow: { label: "AirNow" } },
	available_pollutants: ["pm25", "o3"],
	default_pollutant: "pm25"
} as unknown as MonitorsMeta;

it("defaults to the spec's table with map-sdk's presets", () => {
	const { defaults } = buildToolbar({
		monitors: monitorsOptions(map),
		settings: settingsGroup(map),
		hms: hmsOptions(map),
		meta,
		selection: "pm25",
		layersLabel: "Layers",
		overlaysLabel: "Overlays",
		icons
	});
	expect(defaults).toEqual({
		pollutant: "pm25",
		inactive: false,
		inside: false,
		collocationSites: false,
		clustered: true,
		fireAndSmoke: true,
		evStations: false,
		"ev:lvl2": true,
		"ev:lvl3": true,
		wind: false,
		"type:airnow": true,
		"type:purpleair": true,
		basemap: "streets"
	});
});
