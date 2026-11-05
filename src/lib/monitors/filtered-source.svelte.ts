import type { DataSource, MonitorFeatureProperties } from "@sjvair/map-sdk/data";
import type { MapOptions } from "../options/map-option-defaults";

type Options = Pick<MapOptions, "monitorTypes" | "inactive" | "inside">;

function shown(props: MonitorFeatureProperties, options: Options): boolean {
	return (
		options.monitorTypes[props.type] === true &&
		(props.isActive || options.inactive) &&
		(props.location !== "inside" || options.inside)
	);
}

/**
 * `source` with only the monitors the Monitors menu shows: types that are on, inactive and
 * inside ones only when those are on. Clusters are built from these, so their averages follow.
 */
export function filteredMonitors(
	source: DataSource<MonitorFeatureProperties>,
	options: Options
): DataSource<MonitorFeatureProperties> {
	const features = $derived.by(() => {
		const all = source.features;
		if (!all) return null;
		return { ...all, features: all.features.filter((f) => shown(f.properties, options)) };
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
