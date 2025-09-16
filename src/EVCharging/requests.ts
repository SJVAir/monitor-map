import { EvStation } from "../types";
import { accessDetailCodeTypes, creditCardTypes, evConnectorTypes, evNetworkTypes, facilityTypes } from "./DataMaps";
import * as ZipCodes from "./ZipCodes";

const zipCodes = Object.values(ZipCodes).reduce((prev, curr) => prev.concat(curr)).join(",");

export async function fetchLvl3Stations(): Promise<Array<EvStation>> {
  return fetchEvStations("dc_fast");
}

export async function fetchLvl2Stations(): Promise<Array<EvStation>> {
  return fetchEvStations("2");
}

function getEVStationsURL(chargingLevel: "2" | "dc_fast"): URL {
  const url = new URL(`https://developer.nrel.gov/api/alt-fuel-stations/v1.json`);
  url.searchParams.set("fuel_type", "ELEC");
  url.searchParams.set("state", "CA");
  url.searchParams.set("status", "E");
  url.searchParams.set("access", "public");
  url.searchParams.set("ev_charging_level", chargingLevel);
  url.searchParams.set("zip", zipCodes);
  url.searchParams.set("api_key", import.meta.env.VITE_NREL_KEY);

  return url;
}

async function fetchEvStations(chargingLevel: "2" | "dc_fast"): Promise<Array<EvStation>> {
  const url = getEVStationsURL(chargingLevel);
  return await fetch(url)
    .then(async res => await res.json())
    .then(data => {
      const fuelStations: Array<EvStation> = data.fuel_stations!;
      return fuelStations.map(station => {

        if (station.access_detail_code) {
          station.access_detail_code = accessDetailCodeTypes.get(station.access_detail_code);
        }

        if (station.cards_accepted) {
          station.cards_accepted = station.cards_accepted.split(" ")
            .map(c => creditCardTypes.get(c))
            .join(", ")
        }

        if (station.ev_connector_types && station.ev_connector_types.length) {
          station.ev_connector_types = station.ev_connector_types.map(t => evConnectorTypes.get(t))
        }

        if (station.ev_network) {
          station.ev_network = evNetworkTypes.get(station.ev_network);
        }


        if (station.facility_type) {
          station.facility_type = facilityTypes.get(station.facility_type)
        }

        return station;
      })
        // remove stations with invalid coordinates
        .filter(station => station.id !== 226154);
    });
}
