import { Monitor } from "./Monitor";
import { http, dateUtil } from "../modules";
import type { DateRange } from "../models";
import type { MonitorsRecord, IMonitorData,IMonitorEntry, IMonitorSubscription, IEntriesPageResponse } from "../types";

export async function fetchMonitors(): Promise<MonitorsRecord> {
  return http.get<{ data: Array<IMonitorData> }>("/monitors")
    .then(res => {
      const monitors: MonitorsRecord = {};

      for (let monitorData of res.data.data) {
        // Skip any monitors reporting north of CA
        // TODO: Skip ALL monitors outside of SJV/reporting area
        if (monitorData.position.coordinates[1] > 42) {
          continue;
        }
        monitors[monitorData.id] = new Monitor(monitorData);
      }

      return monitors;
    });
}

export async function fetchEntries(m: Monitor, d: DateRange, pageNumber: number = 1): Promise<Array<IMonitorEntry>> {
  const entries: Array<IMonitorEntry> = [];
  const params = {
    fields: m.dataFields.join(','),
    page: pageNumber,
    timestamp__gte: dateUtil.$defaultFormat(d.start),
    timestamp__lte: dateUtil.$defaultFormat(d.end)
  };

  return http.get<IEntriesPageResponse>(`monitors/${m.data.id}/entries/`, { params })
    .then(async res => {
      const page = res.data;

      if (page.data.length) {
        entries.push(...page.data);

        if (page.has_next_page) {
          const nextEntries = await fetchEntries(m, d, ++pageNumber)
            .catch(err => { throw err; });

          nextEntries.length && entries.push(...nextEntries);
        }
      }

      return entries;
    });
}

export async function fetchSubscriptions(): Promise<Array<IMonitorSubscription>> {
  return http.get("alerts/subscriptions")
    .then(res => res.data.data);
}

export async function fetchTempByCoords(coords: [number, number]): Promise<number> {
  const url = `https://api.weather.gov/points/${ coords.join(",")}`;
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
