import { ref } from "vue";
import { WorkerServiceClient } from "../Webworkers/WorkerServiceClient";
import MonitorsWorkerService from "./worker?worker";

import { Monitor } from "./Monitor";
import type { DateRange } from "../models";
import type { IMonitorEntry, IMonitorSubscription, MonitorId } from "../types";

type MonitorsServiceModule = typeof import("./service");

const monitorsLoadedEvent = new Event("MonitorsLoaded");
const worker = new MonitorsWorkerService();
const monitorsWorkerService = new WorkerServiceClient<MonitorsServiceModule>(worker);

export const monitors = ref<Record<string, Monitor>>({});
export const widgetSubList = ref<Array<MonitorId>>([]);

export async function fetchMonitors(): Promise<void> {
  return await monitorsWorkerService.run("fetchMonitors")
    .then(monitorsRecord => {
      monitors.value = widgetSubList.value.length
        ? widgetSubList.value.reduce((subRecord, id) => ({ [id]: monitorsRecord[id], ...subRecord }), {})
        : monitorsRecord;
      window.dispatchEvent(monitorsLoadedEvent);
    });
}

export async function fetchEntries(m: Monitor, d: DateRange, pageNumber: number = 1): Promise<Array<IMonitorEntry>> {
  return await monitorsWorkerService.run("fetchEntries", m, d, pageNumber);
}

export async function fetchSubscriptions(): Promise<Array<IMonitorSubscription>> {
  return await monitorsWorkerService.run("fetchSubscriptions");
}

export async function fetchTempByCoords(coords: [number, number]): Promise<number> {
  return await monitorsWorkerService.run("fetchTempByCoords", coords);
}
