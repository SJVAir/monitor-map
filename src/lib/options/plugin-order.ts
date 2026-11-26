import type { OptionValues } from "@sjvair/map-sdk";

/** The map's plugins, bottom to top (4.x's layer order). */
export const DRAW_ORDER = [
	"wind",
	"hms-smoke",
	"hms-fire",
	"collocation-sites",
	"monitors",
	"ev-l2",
	"ev-l3"
] as const;

export type PluginKey = (typeof DRAW_ORDER)[number];

/** The first of `present` that draws above `key`: the plugin to add `key` before. */
export function beforeId(key: PluginKey, present: ReadonlySet<string>): string | undefined {
	return DRAW_ORDER.slice(DRAW_ORDER.indexOf(key) + 1).find((above) => present.has(above));
}

/** The plugins `values` put on the map while the monitors show `pollutant`. */
export function wantedPlugins(
	values: OptionValues,
	monitorsOn: boolean,
	pollutant: string | null
): Set<PluginKey> {
	const wanted = new Set<PluginKey>();
	if (values.wind === true) wanted.add("wind");
	if (values.fireAndSmoke === true) {
		wanted.add("hms-smoke");
		wanted.add("hms-fire");
	}
	if (monitorsOn) {
		if (values.collocationSites === true && pollutant === "pm25") wanted.add("collocation-sites");
		wanted.add("monitors");
	}
	if (values.evStations === true) {
		if (values["ev:lvl2"] === true) wanted.add("ev-l2");
		if (values["ev:lvl3"] === true) wanted.add("ev-l3");
	}
	return wanted;
}
