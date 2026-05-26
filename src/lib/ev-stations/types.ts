import type { Feature, Geometry } from "geojson";
import type { MapGeoJSONFeature } from "@maptiler/sdk";

export interface EvStation {
	access_code: string;
	access_days_time: string;
	access_detail_code: string;
	cards_accepted: null | string;
	date_last_confirmed: string;
	groups_with_access_code: string;
	id: number;
	station_name: string;
	station_phone: string;
	updated_at: string;
	facility_type: string;
	latitude: number;
	longitude: number;
	city: string;
	state: string;
	street_address: string;
	zip: string;
	country: string;
	ev_connector_types: Array<string>;
	ev_dc_fast_num: number;
	ev_network: string;
	ev_pricing: string;
}

export interface EvStationMarkerProperties {
	icon: string;
	id: number;
	level: "lvl2" | "lvl3";
	station_name: string;
	facility_type: string;
	ev_network: string;
	station_phone: string;
	street_address: string;
	city: string;
	state: string;
	zip: string;
	access_days_time: string;
	access_detail_code: string;
	cards_accepted: string | null;
	ev_pricing: string;
	ev_connector_types: string; // JSON.stringify(string[])
}

export type EvStationMapFeature = Feature<Geometry, EvStationMarkerProperties>;

export interface EvStationClusterMapFeature extends MapGeoJSONFeature {
	properties: {
		cluster: true;
		cluster_id: number;
		point_count: number;
		point_count_abbreviated: string | number;
	};
	// level is derived from feature.source: "ev-stations-lvl2" | "ev-stations-lvl3"
}
