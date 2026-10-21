import { getMonitorEntries, type MonitorDetails, type MonitorEntry } from "@sjvair/sdk";
import { getUnixTime, parseISO, differenceInMinutes, addMinutes } from "date-fns";
import type { PanelPollutant } from "../monitors/panel-pollutant";
import type { DateRange } from "./DateRange";
import type { SignalOptions } from "$lib/abort";

/** The monitor fields the chart reads. */
export type ChartMonitor = Pick<MonitorDetails, "id" | "name" | "type" | "data_source">;

export async function fetchChartData(
	m: ChartMonitor,
	d: DateRange,
	entryType: PanelPollutant,
	options: SignalOptions = {}
): Promise<uPlot.AlignedData> {
	return await getMonitorEntries(
		{
			entryType,
			monitorId: m.id,
			timestampGte: d.start,
			timestampLte: d.end
		},
		{ signal: options.signal }
	)
		.then((entries) => {
			const xAxisData: Array<Date> = [];
			const updateDuration = m.data_source.name === "PurpleAir" ? 2 : 60;
			const yAxisRecord: Array<number | null> = [];

			for (let i = entries.length - 1; i >= 0; i--) {
				const entry = entries[i];

				if (xAxisData.length > 1) {
					const entryTime = parseISO(entry.timestamp);
					let prevTimestamp = xAxisData[xAxisData.length - 1];

					while (Math.abs(differenceInMinutes(entryTime, prevTimestamp)) > updateDuration + 1) {
						prevTimestamp = addMinutes(prevTimestamp, updateDuration);
						fillChartDataRecords(xAxisData, yAxisRecord, entry, prevTimestamp);
					}
				}

				fillChartDataRecords(xAxisData, yAxisRecord, entry);
			}

			return [xAxisData.map((d) => getUnixTime(d)), yAxisRecord] as uPlot.AlignedData;
		})
		.catch((err) => {
			// A cancelled request is not a failure: let the caller see the reason, log nothing.
			if (options.signal?.aborted) throw options.signal.reason;
			console.error("Failed to load chart data: ", err);
			return [] as uPlot.AlignedData;
		});
}

function fillChartDataRecords(
	xAxisData: Array<Date>,
	yAxisRecord: Array<number | null>,
	entry: MonitorEntry,
	timestamp?: Date
) {
	xAxisData.push(timestamp ?? parseISO(entry.timestamp));
	const value = parseFloat(entry.value);
	yAxisRecord.push(timestamp ? null : value >= 0 ? value : 0);
}
