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
