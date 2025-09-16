import { getMonitorsLatest, getSubscriptions } from "../modules/api";
import { Monitor } from "./Monitor";
import type { MonitorsRecord } from "../types";

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

export async function fetchSubscriptions(): Promise<Array<any>> {
  return await getSubscriptions("");
}

export async function fetchTempByCoords(coords: [number, number]): Promise<number> {
  const url = `https://api.weather.gov/points/${coords.join(",")}`;
  return await fetch(url)
    .then(async res => await res.json())
    .then(async data => {
      try {
        const forecast = await fetch(data.properties.forecastHourly).then(async res => await res.json())
        return forecast.properties.periods[0].temperature;
      } catch (err) {
        throw err
      }
    });
}
