import { http } from "../modules";
import { IEvStation } from "../types";
import { accessDetailCodeTypes, creditCardTypes, evConnectorTypes, evNetworkTypes, facilityTypes } from "./DataMaps";
import * as ZipCodes from "./ZipCodes";

const zipCodes = Object.values(ZipCodes).reduce((prev, curr) => prev.concat(curr)).join(",");

export async function fetchLvl3Stations(): Promise<Array<IEvStation>> {
  return fetchEvStations("dc_fast");
}

export async function fetchLvl2Stations(): Promise<Array<IEvStation>> {
  return fetchEvStations("2");
}

async function fetchEvStations(chargingLevel: "2" | "dc_fast"): Promise<Array<IEvStation>> {
  return http.get(`https://developer.nrel.gov/api/alt-fuel-stations/v1.json`, {
        params: {
        fuel_type: "ELEC",
        state: "CA",
        status: "E",
        access: "public",
        ev_charging_level: chargingLevel,
        zip: zipCodes,
        api_key: import.meta.env.VITE_NREL_KEY
      }
    }).then(res => {
        const fuelStations: Array<IEvStation> = res.data.fuel_stations!;
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
