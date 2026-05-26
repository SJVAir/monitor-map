import {
	accessDetailCodeTypes,
	creditCardTypes,
	evConnectorTypes,
	evNetworkTypes,
	facilityTypes
} from "./data-maps.ts";
import type { EvStation } from "./types.ts";
import * as ZipCodes from "./zip-codes.ts";

class EvStationsManager {
	lvl2Stations: Array<EvStation> | undefined = $state();
	lvl3Stations: Array<EvStation> | undefined = $state();

	async fetchLvl3Stations(): Promise<void> {
		this.lvl3Stations = await fetchEvStations("dc_fast");
	}

	async fetchLvl2Stations(): Promise<void> {
		this.lvl2Stations = await fetchEvStations("2");
	}
}

const zipCodes = Object.values(ZipCodes)
	.reduce((prev, curr) => prev.concat(curr))
	.join(",");

async function fetchEvStations(chargingLevel: "2" | "dc_fast"): Promise<Array<EvStation>> {
	const url = new URL(`https://developer.nlr.gov/api/alt-fuel-stations/v1.json`);
	url.searchParams.set("fuel_type", "ELEC");
	url.searchParams.set("state", "CA");
	url.searchParams.set("status", "E");
	url.searchParams.set("access", "public");
	url.searchParams.set("ev_charging_level", chargingLevel);
	url.searchParams.set("zip", zipCodes);
	url.searchParams.set("api_key", import.meta.env.VITE_NREL_KEY);

	return await fetch(url)
		.then(async (res) => await res.json())
		.then((data) => {
			const fuelStations: Array<EvStation> = data.fuel_stations!;
			return (
				fuelStations
					.map((station) => {
						if (station.access_detail_code) {
							station.access_detail_code = accessDetailCodeTypes.get(station.access_detail_code);
						}

						if (station.cards_accepted) {
							station.cards_accepted = station.cards_accepted
								.split(" ")
								.map((c: string) => creditCardTypes.get(c))
								.join(", ");
						}

						if (station.ev_connector_types && station.ev_connector_types.length) {
							station.ev_connector_types = station.ev_connector_types.map((t: string) =>
								evConnectorTypes.get(t)
							);
						}

						if (station.ev_network) {
							station.ev_network = evNetworkTypes.get(station.ev_network);
						}

						if (station.facility_type) {
							station.facility_type = facilityTypes.get(station.facility_type);
						}

						return station;
					})
					// remove stations with invalid coordinates
					.filter((station) => station.id !== 226154)
			);
		});
}

export const evStationsManager = new EvStationsManager();
export type { EvStationsManager };
