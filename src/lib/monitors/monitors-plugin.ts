import { monitorsPlugin, type MapPlugin } from "@sjvair/map-sdk";
import type { DataSource, MonitorFeatureProperties } from "@sjvair/map-sdk/data";

/**
 * The map's monitors layer: selectable, the selected monitor enlarged. A tapped monitor shows no
 * hover tooltip, since its detail panel opens instead; a mouse hover still shows one.
 */
export function mapMonitorsPlugin(
	source: DataSource<MonitorFeatureProperties>,
	options: { clustered: boolean }
): MapPlugin {
	return monitorsPlugin({
		id: "monitors",
		source,
		layerLabel: "Monitors",
		selectable: true,
		selectedStyle: "enlarge",
		clustered: options.clustered,
		tooltipOnTouch: false
	});
}
