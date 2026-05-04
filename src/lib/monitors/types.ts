import type { Feature, Geometry } from "geojson";
import type { MonitorType } from "@sjvair/sdk";

export type MonitorMapFeature = Feature<Geometry, MonitorMarkerProperties>;

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
