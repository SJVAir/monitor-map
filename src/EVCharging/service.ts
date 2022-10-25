import { http } from "../modules";
import { IEvStation } from "../types";
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
        return res.data.fuel_stations;
    });
}
