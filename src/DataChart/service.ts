import { fillChartDataRecords } from "./mod";
import { MonitorFieldColors, fetchEntries } from "../Monitors";
import { dateUtil } from "../modules";
import type { Monitor } from "../Monitors";
import type { DateRange } from "../models";
import type { ChartDataField } from "../types";
import type { Dayjs } from "dayjs";


export async function fetchChartData(m: Monitor, d: DateRange): Promise<uPlot.AlignedData> {
  return fetchEntries(m, d)
    .then(entries => {
      const xAxisData: Array<Dayjs> = [];
      const updateDuration = (m.data.device === "PurpleAir") ? 2 : 60;

      const yAxisRecord: Map<ChartDataField, Array<number>> = new Map(
        (Object.keys(MonitorFieldColors) as Array<ChartDataField>)
          .map(dataKey => [dataKey, []])
      );

      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];

        if (xAxisData.length > 1) {
          let prevTimestamp = dateUtil(xAxisData[xAxisData.length - 1]);

          while (prevTimestamp.skewedDiff(entry.timestamp, updateDuration) > updateDuration + 1) {
            prevTimestamp = prevTimestamp.add(updateDuration, "m");

            fillChartDataRecords(xAxisData, yAxisRecord, entry, prevTimestamp)
          }
        }

        fillChartDataRecords(xAxisData, yAxisRecord, entry);
      }

      return [
        xAxisData.map(d => d.unix()),
        ...yAxisRecord.values()
      ].filter(collection => collection.length) as uPlot.AlignedData;
    });
}
