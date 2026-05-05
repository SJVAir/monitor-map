import type { Feature, Geometry } from "geojson";
import type { MonitorType } from "@sjvair/sdk";

export type MonitorMapFeature = Feature<Geometry, MonitorMarkerProperties>;
export type MonitorClusterMapFeature = Feature<Geometry, MonitorClusterMarkerProperties>;

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
