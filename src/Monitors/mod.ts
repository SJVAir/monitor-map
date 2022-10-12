import { http, dateUtil } from "../modules";
import { DateRange } from "../models";
import { monitors } from "./BackgroundService";
import type { Monitor } from "./Monitor";
import type { MonitorId } from "../types";


export const MonitorFieldColors = {
  pm25: "#00ccff",
  pm25_avg_15: "#006699",
  pm25_avg_60: "#000033"
} as const;

export function getMonitor(id: MonitorId) {
  return monitors.value[id];
}

export function downloadCSV(monitor: Monitor, dateRange: DateRange): void {
  const path = import.meta.env.DEV 
    ? `${ http.defaults.baseURL }monitors/${ monitor.data.id }/entries/csv`
    : `${ window.location.origin }${ http.defaults.baseURL }monitors/${ monitor.data.id }/entries/csv`;
  const params = new URLSearchParams({
    fields: monitor.dataFields.join(','),
    timestamp__gte: dateUtil.$defaultFormat(dateRange.start),
    timestamp__lte: dateUtil.$defaultFormat(dateRange.end),
  }).toString();

  window.open(`${ path }/?${ params }`);
}

