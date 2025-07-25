import { getMonitorsLatest, setOrigin } from "@sjvair/sdk";
import { Monitor } from "./Monitor";
import { http } from "../modules";
import type { MonitorsRecord, IMonitorSubscription } from "../types";

if (!import.meta.env.PROD) {
  setOrigin("http://127.0.0.1:8000");
}


export async function fetchMonitors(pollutant: "pm25" | "o3"): Promise<MonitorsRecord> {
  return getMonitorsLatest(pollutant)
    .then(monitors => {
      const record: MonitorsRecord = {};

      if (monitors && Object.keys(monitors).length) {
        for (let monitorData of monitors) {
          record[monitorData.id] = new Monitor(monitorData);
        }
      }

      return record;
    });
}

export async function fetchSubscriptions(): Promise<Array<IMonitorSubscription>> {
  return http.get("alerts/subscriptions")
    .then(res => res.data.data);
}

export async function fetchTempByCoords(coords: [number, number]): Promise<number> {
  const url = `https://api.weather.gov/points/${coords.join(",")}`;
  return await http(url)
    .then(async res => {
      try {
        const forecast = await http(res.data.properties.forecastHourly)
        return forecast.data.properties.periods[0].temperature;
      } catch (err) {
        throw err
      }
    });

}
