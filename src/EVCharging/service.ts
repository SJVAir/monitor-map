import { http } from "../modules";
import { IEvStation } from "../types";
import {facilityTypes} from "./FacilityTypes";
import * as ZipCodes from "./ZipCodes";

const zipCodes = Object.values(ZipCodes).reduce((prev, curr) => prev.concat(curr)).join(",");

export async function fetchEvStations(): Promise<Array<IEvStation>> {
  return http.get(`https://developer.nrel.gov/api/alt-fuel-stations/v1.json`, {
        params: {
        fuel_type: "ELEC",
        state: "CA",
        status: "E",
        access: "public",
        ev_charging_level: "2,dc_fast",
        zip: zipCodes,
        api_key: import.meta.env.VITE_NREL_KEY
      }
    }).then(res => {
        const fuelStations: Array<IEvStation> = res.data.fuel_stations!;
        return fuelStations.map(station => {
          station.facility_type = facilityTypes.get(station.facility_type)

          return station;
        });
    });
}
