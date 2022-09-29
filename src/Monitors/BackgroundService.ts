import { WorkerServiceClient } from "../Webworkers/WorkerServiceClient";
import MonitorsWorkerService from "./worker?worker";

import { Monitor } from "./Monitor";
import type { DateRange } from "../models";
import type { ChartDataArray, IMonitorEntry, IMonitorSubscription } from "../types";

type MonitorsServiceModule = typeof import("./service");

const monitorsLoadedEvent = new Event("MonitorsLoaded");
const worker = new MonitorsWorkerService();
const monitorsWorkerService = new WorkerServiceClient<MonitorsServiceModule>(worker);

export let monitors: Record<string, Monitor> = {};

export async function fetchMonitors(): Promise<void> {
  return await monitorsWorkerService.run("fetchMonitors")
    .then(monitorsRecord => {
      monitors = monitorsRecord;
      window.dispatchEvent(monitorsLoadedEvent);
    });
}

export async function fetchEntries(m: Monitor, d: DateRange, pageNumber: number = 1): Promise<Array<IMonitorEntry>> {
  return await monitorsWorkerService.run("fetchEntries", m, d, pageNumber);
}

export async function fetchChartData(m: Monitor, d: DateRange): Promise<ChartDataArray> {
  return await monitorsWorkerService.run("fetchChartData", m, d);
}

export async function loadSubscriptions(): Promise<Array<IMonitorSubscription>> {
  return await monitorsWorkerService.run("loadSubscriptions");
}
