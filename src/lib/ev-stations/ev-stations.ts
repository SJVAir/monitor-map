import {
	accessDetailCodeTypes,
	creditCardTypes,
	evConnectorTypes,
	evNetworkTypes,
	facilityTypes
} from "./data-maps";
import { monitorMapConfig } from "../config.svelte.js";
import type { EvStation } from "./types";
import { EV_ZIP_CODES } from "./zip-codes";

/** Which NREL charging level each map level asks for. */
const CHARGING_LEVEL = { lvl2: "2", lvl3: "dc_fast" } as const;

/**
 * Fetches the public electric chargers of one level in the Valley's ZIPs from NREL (key from
 * `monitorMapConfig().nrelKey`), with codes turned into labels. Station 226154 is dropped: its
 * coordinates are wrong.
 */
export async function fetchEvStations(
	level: "lvl2" | "lvl3",
	signal?: AbortSignal
): Promise<Array<EvStation>> {
	if (signal?.aborted) throw signal.reason;
	const url = new URL(`https://developer.nlr.gov/api/alt-fuel-stations/v1.json`);
	url.searchParams.set("fuel_type", "ELEC");
	url.searchParams.set("state", "CA");
	url.searchParams.set("status", "E");
	url.searchParams.set("access", "public");
	url.searchParams.set("ev_charging_level", CHARGING_LEVEL[level]);
	url.searchParams.set("zip", EV_ZIP_CODES.join(","));
	url.searchParams.set("api_key", monitorMapConfig().nrelKey);

	const res = await fetch(url, { signal });
	if (!res.ok) throw new Error(`EV chargers: NREL answered ${res.status}`);
	const data = await res.json();
	const fuelStations: Array<EvStation> = data.fuel_stations;
	if (!Array.isArray(fuelStations)) throw new Error("EV chargers: no fuel_stations in the answer");
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
}
