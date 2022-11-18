import { onBeforeMount, onBeforeUnmount, ref } from "vue";
import { http, dateUtil } from "../modules";
import { DateRange } from "../models";
import type { Monitor } from "./Monitor";
import type { MonitorId } from "../types";

type milliseconds = number;

const monitorsLoadedEvent = new Event("MonitorsLoaded");
const monitors = ref<Record<string, Monitor>>({});
const widgetSubList = ref<Array<MonitorId>>([]);
let service: typeof import("./requests") | typeof import("./BackgroundRequests");
let updateInterval: number;
let initialized = false;

interface MonitorsServiceConfig {
  reloadInterval: milliseconds;
  webworker: boolean;
}

export async function useMonitorsService(config?: Partial<MonitorsServiceConfig>) {
  if (!initialized) {
    await initializeMonitorService(config);
  }
  return {
    ...service,
    downloadCSV,
    fetchMonitors,
    getMonitor,
    monitors,
    widgetSubList
  };
}

async function initializeMonitorService(config?: Partial<MonitorsServiceConfig>) {
  const opts: MonitorsServiceConfig = {
    reloadInterval: config?.reloadInterval || 1000 * 60 * 2,
    webworker: config?.webworker || true
  };

  //@ts-ignore: Cannot find name 'WorkerGlobalScope'
  // 'WorkerGlobalScope' only exists in web workers
  if (typeof WorkerGlobalScope !== 'undefined') {
    opts.webworker = false;

  } else {
    onBeforeMount(async () => {
      await fetchMonitors();

      if (!updateInterval || updateInterval <= 0 && opts.reloadInterval > 0) {
        updateInterval = window.setInterval(async () => await fetchMonitors(), 1000 * 60 * 2);

      }
    });

    onBeforeUnmount(() => {
      clearInterval(updateInterval);
      updateInterval = 0;
    });

  }

  if (!service) {
    service = opts.webworker
      ? await import("./BackgroundRequests")
      : await import("./requests");
  }

  initialized = true;
}

function downloadCSV(monitor: Monitor, dateRange: DateRange): void {
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

async function fetchMonitors(): Promise<void> {
  return await service.fetchMonitors()
    .then(monitorsRecord => {
      monitors.value = widgetSubList.value.length
        ? widgetSubList.value.reduce((subRecord, id) => ({ [id]: monitorsRecord[id], ...subRecord }), {})
        : monitorsRecord;
      window.dispatchEvent(monitorsLoadedEvent);
    });
}

export function getMonitor(id: MonitorId) {
  return monitors.value[id];
}
