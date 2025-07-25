import { WorkerServiceClient } from "../Webworkers/WorkerServiceClient";
import type { IMonitorSubscription, MonitorsRecord } from "../types";

type MonitorsServiceModule = typeof import("./requests");

import MonitorsWorkerService from "./MonitorsWorker?worker";
import { MonitorEntry } from "@sjvair/sdk";
const worker = new MonitorsWorkerService();
// FIXME: https://github.com/vitejs/vite/issues/9566
//import MonitorsWorkerServiceURL from "./MonitorsWorker?url";
//const worker = new Worker(MonitorsWorkerServiceURL, { type: 'module' })

const monitorsWorkerService = new WorkerServiceClient<MonitorsServiceModule>(worker);

export async function fetchMonitors(pollutant: "pm25" | "o3"): Promise<MonitorsRecord> {
  return await monitorsWorkerService.run("fetchMonitors", pollutant);
}

export async function fetchSubscriptions(): Promise<Array<IMonitorSubscription>> {
  return await monitorsWorkerService.run("fetchSubscriptions");
}

export async function fetchTempByCoords(coords: [number, number]): Promise<number> {
  return await monitorsWorkerService.run("fetchTempByCoords", coords);
}

//export function queryMonitorsData(queryString: string) {
//  queryString = queryString.toLowerCase();
//  
//  const externalResults = ref([]);
//
//  http(`https://api.maptiler.com/geocoding/${ queryString }.json?key=${ import.meta.env.VITE_MAPTILER_KEY }`)
//    .then(res => externalResults.value = res.data.features
//          .sort((a: any, b: any) => b.relevance - a.relevance)
//          .slice(0, 3))
//    .catch(() => console.log("Failed to fetch locations"));
//
//  const localResults = Object.values(monitors.value).map(m => m.data)
//    .filter(m => queryString.split(",").forEach(query => Object.values(m)
//            .filter(v => typeof v === "string")
//            .map(str => str.toLowerCase())
//            .some(val => val.includes(query.trim().toLowerCase()))));
//
//
//  return { localResults, externalResults };
//}
