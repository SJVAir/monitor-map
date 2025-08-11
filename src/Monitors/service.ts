import { ref } from "vue";
import { useRoute } from "vue-router";
import { http, dateUtil, asyncInitializer } from "../modules";
import { DateRange } from "../models";
import * as MonitorsService from "./BackgroundRequests";
import type { Ref } from "vue";
import type { Monitor } from "./Monitor";
import type { MonitorId } from "../types";

const monitorsLoadedEvent = new Event("MonitorsLoaded");
export const primaryPollutant = ref<"pm25" | "o3">(getPrimaryPollutant());
const monitors = ref<Record<string, Monitor>>({});
const activeMonitor = ref<Monitor>();
function getPrimaryPollutant(): "pm25" | "o3" {
  const today = new Date();
  const may = new Date(`05/01/${today.getUTCFullYear()}`);
  const september = new Date(`09/30/${today.getUTCFullYear()}`);

  //return (today > may && today < september) ? "o3" : "pm25";
  // Overriding at Tim's request
  return "pm25";
}


interface MonitorsServiceExtras {
  activeMonitor: Ref<Monitor | undefined>;
  monitors: Ref<Record<string, Monitor>>;
  updateMonitors(): Promise<void>;
  downloadCSV(monitor: Monitor, dateRange: DateRange): void;
  getMonitor(id: MonitorId): Monitor;
}

type MonitorsServiceModule = MonitorsServiceExtras & typeof MonitorsService;
export const useMonitorsService = asyncInitializer<MonitorsServiceModule>(async (resolve) => {
  const route = useRoute();

  await updateMonitors();

  if ("monitorId" in route.params) {
    activeMonitor.value = monitors.value[route.params.monitorId as string];
  }

  resolve({
    activeMonitor,
    monitors,
    downloadCSV,
    getMonitor,
    updateMonitors,
    ...MonitorsService
  });
});

function downloadCSV(monitor: Monitor, dateRange: DateRange): void {
  const path = import.meta.env.DEV
    ? `${http.defaults.baseURL}monitors/${monitor.data.id}/entries/csv`
    : `${http.defaults.baseURL}monitors/${monitor.data.id}/entries/csv`;
  const params = new URLSearchParams({
    fields: monitor.dataFields.join(','),
    timestamp__gte: dateUtil.$defaultFormat(dateRange.start),
    timestamp__lte: dateUtil.$defaultFormat(dateRange.end),
  }).toString();

  window.open(`${path}/?${params}`);
}

export async function updateMonitors(): Promise<void> {
  return await MonitorsService.fetchMonitors(primaryPollutant.value)
    .then(monitorsRecord => {
      monitors.value = monitorsRecord;
      window.dispatchEvent(monitorsLoadedEvent);
    });
}

export function getMonitor(id: MonitorId): Monitor {
  return monitors.value[id];
}
