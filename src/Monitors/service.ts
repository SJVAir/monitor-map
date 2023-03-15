import { onBeforeMount, onBeforeUnmount, ref } from "vue";
import { http, dateUtil, asyncInitializer } from "../modules";
import { DateRange } from "../models";
import { useWidgetMode } from "../modules";
import type { Ref } from "vue";
import type { Monitor } from "./Monitor";
import type { MonitorId } from "../types";

const monitorsLoadedEvent = new Event("MonitorsLoaded");
const monitors = ref<Record<string, Monitor>>({});
let service: typeof import("./requests") | typeof import("./BackgroundRequests");
let intervalUpdater: number;

interface MonitorsServiceExtras {
  downloadCSV(monitor: Monitor, dateRange: DateRange): void;
  getMonitor(id: MonitorId): Monitor;
  monitors: Ref<Record<string, Monitor>>;
}

type MonitorsServiceModule = MonitorsServiceExtras & typeof service;
export const useMonitorsService = asyncInitializer<MonitorsServiceModule>((resolve, reject) => {
  const reloadInterval = 1000 * 60 * 2;
  let webworker = true;

  //@ts-ignore: Cannot find name 'WorkerGlobalScope'
  // 'WorkerGlobalScope' only exists in web workers
  if (typeof WorkerGlobalScope !== 'undefined') {
    webworker = false;

  } else {
    onBeforeMount(async () => {
      await updateMonitors();

      if (!intervalUpdater || intervalUpdater <= 0 && reloadInterval > 0) {
        intervalUpdater = window.setInterval(async () => await updateMonitors(), 1000 * 60 * 2);
      }
    });

    onBeforeUnmount(() => {
      clearInterval(intervalUpdater);
      intervalUpdater = 0;
    });

  }

  const importService = webworker
    ? import("./BackgroundRequests")
    : import("./requests");

  importService.then(serviceModule => {
    service = serviceModule;
    resolve({
      ...serviceModule,
      downloadCSV,
      getMonitor,
      monitors,
    });
  })
  .catch(reject);
});

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

async function updateMonitors(): Promise<void> {
  const { widgetSubList } = await useWidgetMode();
  return await service.fetchMonitors()
    .then(monitorsRecord => {
      monitors.value = widgetSubList.value.length
        ? widgetSubList.value.reduce((subRecord, id) => ({ [id]: monitorsRecord[id], ...subRecord }), {})
        : monitorsRecord;
      window.dispatchEvent(monitorsLoadedEvent);
    });
}

export function getMonitor(id: MonitorId): Monitor {
  return monitors.value[id];
}
