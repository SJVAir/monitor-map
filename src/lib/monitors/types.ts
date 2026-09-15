import type { Feature, Geometry } from "geojson";
import type { MonitorLatestType, MonitorsMeta, MonitorType, SJVAirEntryLevel } from "@sjvair/sdk";
import type { MapGeoJSONFeature } from "@maptiler/sdk";
import type { XMap } from "@tstk/builtin-extensions";

export type MonitorMapFeature = Feature<Geometry, MonitorMarkerProperties>;

export interface MonitorClusterMapFeature extends MapGeoJSONFeature {
	properties: MonitorClusterMarkerProperties;
}

export interface MonitorMarkerProperties {
	icon: string;
	id: string;
	is_active: boolean;
	is_sjvair?: boolean;
	location: string;
	name: string;
	order: number;
	type: MonitorType;
	value: string;
}

export interface MonitorClusterMarkerProperties {
	cluster: true;
	cluster_id: number;
	point_count: number;
	point_count_abbreviated: string | number;
	sumValues: number;
	countValues: number;
}

/** The pollutants monitorsMapIntegration/monitorsIconManager can render. */
export type MonitorsPollutant = "pm25" | "o3";

/**
 * The reactive data a monitors map display needs: which monitors exist, their
 * per-monitor "latest" value for the active pollutant, and the entry-level metadata
 * used to color icons. `monitorsManager` (live, auto-polling) is the default
 * implementation; a host app can supply its own (e.g. one backed by historical
 * summaries instead of live readings) to reuse the map rendering with different data.
 */
export interface MonitorsDataSource {
	readonly meta: MonitorsMeta | null;
	readonly pollutant: MonitorsPollutant | null;
	readonly latest: XMap<string, MonitorLatestType<MonitorsPollutant>> | null;
	readonly levels: Array<SJVAirEntryLevel> | null;
}
