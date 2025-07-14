import { dateUtil } from "../modules/date";
import { primaryPollutant, type Monitor } from "../Monitors";
import type { DateRange } from "../models";
import type { Dayjs } from "dayjs";
import { getMonitorEntries, setOrigin, type MonitorEntry } from "@sjvair/sdk";

if (!import.meta.env.PROD) {
  setOrigin("http://127.0.0.1:8000");
}

export async function fetchChartData(m: Monitor, d: DateRange): Promise<uPlot.AlignedData> {
  return getMonitorEntries({
    field: primaryPollutant.value,
    monitorId: m.data.id,
    timestampGte: d.start,
    timestampLte: d.end
  })
    .then(entries => {
      const xAxisData: Array<Dayjs> = [];
      const updateDuration = (m.data.data_source.name === "PurpleAir") ? 2 : 60;

      const yAxisRecord: Array<number> = [];

      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];

        if (xAxisData.length > 1) {
          const entrytime = dateUtil(entry.timestamp).utc().tz('America/Los_Angeles').toISOString();
          let prevTimestamp = dateUtil(xAxisData[xAxisData.length - 1]);

          while (prevTimestamp.skewedDiff(entrytime, updateDuration) > updateDuration + 1) {
            prevTimestamp = prevTimestamp.add(updateDuration, "m");
            fillChartDataRecords(xAxisData, yAxisRecord, entry, prevTimestamp)
          }
        }

        fillChartDataRecords(xAxisData, yAxisRecord, entry);
      }

      return [
        xAxisData.map(d => d.unix()),
        yAxisRecord
      ] as uPlot.AlignedData;
    })
    .catch(err => err);
}

function fillChartDataRecords(
  xAxisData: Array<Dayjs>,
  yAxisRecord: Array<number | null>,
  entry: MonitorEntry,
  timestamp?: Dayjs,
) {
  if (timestamp) {
    xAxisData.push(timestamp.utc().tz('America/Los_Angeles'));
  } else {
    xAxisData.push(dateUtil(entry.timestamp).utc().tz('America/Los_Angeles'));
  }

  let dataPoint: number | null;

  if (timestamp) {
    dataPoint = null
  } else {
    const value = parseFloat(entry.value)
    dataPoint = (value >= 0) ? value : 0;
  }

  yAxisRecord.push(dataPoint);
}
