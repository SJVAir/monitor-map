import type { MapOptions } from "./map-option-defaults";

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

/** The plugins `options` put on the map while the monitors show `pollutant`. */
export function wantedPlugins(options: MapOptions, pollutant: string | null): Set<PluginKey> {
	const wanted = new Set<PluginKey>();
	if (options.wind) wanted.add("wind");
	if (options.fireAndSmoke) {
		wanted.add("hms-smoke");
		wanted.add("hms-fire");
	}
	if (options.monitorsOn) {
		if (options.collocationSites && pollutant === "pm25") wanted.add("collocation-sites");
		wanted.add("monitors");
	}
	if (options.evStations) {
		if (options.evLevels.lvl2) wanted.add("ev-l2");
		if (options.evLevels.lvl3) wanted.add("ev-l3");
	}
	return wanted;
}
