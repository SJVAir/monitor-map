import { Monitor } from "./Monitor";
import { ChartDataPoint } from "../models";
import { http, dateUtil, MonitorFieldColors } from "../modules";
import type { DateRange } from "../models";
import type { ChartDataArray, ChartDataField, MonitorsRecord, IMonitorData,IMonitorEntry, IMonitorSubscription, IEntriesPageResponse, MonitorDataFieldName } from "../types";

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

export async function fetchChartData(m: Monitor, d: DateRange): Promise<ChartDataArray> {
  return fetchEntries(m, d)
    .then(entries => {
      const dataKeys: Array<[MonitorDataFieldName, Array<ChartDataPoint>]> = Object.keys(entries[0])
        .filter((dataKey): dataKey is MonitorDataFieldName  => dataKey.slice(0, 2) === "pm")
        .map(dataKey => [dataKey, []]);

      const chartDataRecord: Map<MonitorDataFieldName, Array<ChartDataPoint>> = new Map(dataKeys);

      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];

        for (let dataKey of chartDataRecord.keys()) {
          if (dataKey in MonitorFieldColors) {
            const collection = chartDataRecord.get(dataKey)!;
            const dataField = m.monitorFields[dataKey];
            const dataPoint = new ChartDataPoint(MonitorFieldColors[dataKey as ChartDataField]!, dataField.name as ChartDataField, entry);

            collection.unshift(dataPoint);
          }
        }
      }

      return Array.from(chartDataRecord, ([_, chartData]) => chartData);
    });
}

export async function loadSubscriptions(): Promise<Array<IMonitorSubscription>> {
  return http.get("alerts/subscriptions")
    .then(res => res.data);
}
