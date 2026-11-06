import { createRawSnippet } from "svelte";
import { pointsPlugin, type MapPlugin } from "@sjvair/map-sdk";
import type { DataSource } from "@sjvair/map-sdk/data";
import { EV_STATION_LEVELS, evStationIcon } from "./ev-station-icons";
import type { EvFeatureProperties, EvLevel } from "./ev-store.svelte.js";

export type EvPluginId = "ev-l2" | "ev-l3";

export const EV_PLUGIN_IDS: Record<EvLevel, EvPluginId> = { lvl2: "ev-l2", lvl3: "ev-l3" };

const LEVEL_LABELS: Record<EvLevel, string> = { lvl2: "Level 2", lvl3: "Level 3" };

/** The marker size, as in 4.x. */
const ICON_SIZE = 32;

/** "rgb(r, g, b)" at 0.6 alpha, the cluster bubbles' fill in 4.x. */
function clusterFill(rgb: string): string {
	return rgb.replace("rgb(", "rgba(").replace(")", ", 0.6)");
}

/** 4.x's cluster tooltip: "Level 2 Chargers" over "N stations". */
function clusterTooltip(level: EvLevel, count: number) {
	return createRawSnippet(() => ({
		render: () =>
			`<div class="flex flex-col gap-1 p-1"><p class="font-semibold">${LEVEL_LABELS[level]} Chargers</p><p class="text-sm">${count} stations</p></div>`
	}));
}

/** Under a station's name in the hover tooltip, in place of map-sdk's "No level" chip. */
function stationTooltip(level: EvLevel) {
	return createRawSnippet(() => ({
		render: () => `<p class="text-sm">${LEVEL_LABELS[level]} charger</p>`
	}));
}

/**
 * One level of EV chargers, as 4.x drew them: the level's charger icon and, clustered, bubbles in
 * the level's color (radius 15/20/25 by count, with a white count) that zoom in on click. Stations
 * are listed for the feature list; a click on one is a `featureclick` with a `feature` ref whose
 * id is the station id (the layout opens the popup).
 */
export function evPlugin(
	level: EvLevel,
	source: DataSource<EvFeatureProperties>,
	options: { clustered: boolean }
): MapPlugin {
	const { bg, border } = EV_STATION_LEVELS[level];
	const icon = evStationIcon(bg, border);
	return pointsPlugin<EvFeatureProperties>({
		id: EV_PLUGIN_IDS[level],
		source,
		layerLabel: `${LEVEL_LABELS[level]} Chargers`,
		selectable: false,
		icon: { category: () => level, draw: () => icon, size: ICON_SIZE },
		tooltip: () => stationTooltip(level),
		...(options.clustered && {
			cluster: {
				radius: 40,
				maxZoom: 9,
				layers: ({ sourceId }) => [
					{
						local: "cluster-circle",
						spec: {
							type: "circle",
							source: sourceId,
							filter: ["has", "point_count"],
							paint: {
								"circle-color": clusterFill(bg),
								"circle-radius": ["step", ["get", "point_count"], 15, 10, 20, 25, 25]
							}
						}
					},
					{
						local: "cluster-label",
						spec: {
							type: "symbol",
							source: sourceId,
							filter: ["has", "point_count"],
							layout: {
								"text-field": ["get", "point_count_abbreviated"],
								"text-size": 12,
								"text-allow-overlap": true,
								"text-ignore-placement": true
							},
							paint: { "text-color": "#ffffff" }
						}
					}
				],
				tooltip: (cluster) => clusterTooltip(level, cluster.pointCount)
			}
		})
	});
}
