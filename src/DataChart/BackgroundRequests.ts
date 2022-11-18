import { WorkerServiceClient } from "../Webworkers/WorkerServiceClient";

import type { Monitor } from "../Monitors";
import type { DateRange } from "../models";


//import DataChartWorkerService from "./DataChartWorker?worker";
//const worker = new DataChartWorkerService();
// FIXME: https://github.com/vitejs/vite/issues/9566
import DataChartWorkerServiceURL from "./DataChartWorker?url";
const worker = new Worker(DataChartWorkerServiceURL, { type: 'module' })

const dataChartWorkerService = new WorkerServiceClient<DataChartServiceModule>(worker);

type DataChartServiceModule = typeof import("./requests");

export async function fetchChartData(m: Monitor, d: DateRange): Promise<uPlot.AlignedData> {
  return await dataChartWorkerService.run("fetchChartData", m, d);
}
