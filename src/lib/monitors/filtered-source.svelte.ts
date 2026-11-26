import type { DataSource, MonitorFeatureProperties } from "@sjvair/map-sdk/data";
import type { OptionValues } from "@sjvair/map-sdk";
import { typeOn } from "../options/option-values.svelte.js";

function shown(props: MonitorFeatureProperties, values: OptionValues): boolean {
	return (
		typeOn(values, props.type) &&
		(props.isActive || values.inactive === true) &&
		(props.location !== "inside" || values.inside === true)
	);
}

/**
 * `source` with only the monitors the toolbar's Monitors rows show: types that are on, inactive
 * and inside ones only when those are on. Clusters are built from these, so their averages follow.
 */
export function filteredMonitors(
	source: DataSource<MonitorFeatureProperties>,
	values: OptionValues
): DataSource<MonitorFeatureProperties> {
	const features = $derived.by(() => {
		const all = source.features;
		if (!all) return null;
		return { ...all, features: all.features.filter((f) => shown(f.properties, values)) };
	});
	return {
		get status() {
			return source.status;
		},
		get features() {
			return features;
		},
		get scale() {
			return source.scale;
		}
	};
}
