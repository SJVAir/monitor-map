import { Monitor } from "./Monitor";
import { http } from "../modules";
import { MonitorEntry, getMonitorEntries, getMonitorsLatest, setOrigin } from "@sjvair/sdk";
import type { DateRange } from "../models";
import type { MonitorsRecord, IMonitorSubscription } from "../types";

if (!import.meta.env.PROD) {
  setOrigin("http://127.0.0.1:8000");
}

export async function fetchMonitors(): Promise<MonitorsRecord> {
  return getMonitorsLatest("pm25")
    .then(monitors => {
      const record: MonitorsRecord = {};

      for (let monitorData of monitors) {
        record[monitorData.id] = new Monitor(monitorData);
      }

      return record;
    });
}

export async function fetchEntries(m: Monitor, d: DateRange): Promise<Array<MonitorEntry>> {
  return await getMonitorEntries({
    field: "pm25",
    monitorId: m.data.id,
    timestampGte: d.start,
    timestampLte: d.end
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
