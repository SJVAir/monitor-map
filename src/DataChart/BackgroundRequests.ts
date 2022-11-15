import { WorkerServiceClient } from "../Webworkers/WorkerServiceClient";
import DataChartWorkerService from "./DataChartWorker?worker";

import type { Monitor } from "../Monitors";
import type { DateRange } from "../models";

type DataChartServiceModule = typeof import("./requests");

const worker = new DataChartWorkerService();
const dataChartWorkerService = new WorkerServiceClient<DataChartServiceModule>(worker);

export async function fetchChartData(m: Monitor, d: DateRange): Promise<uPlot.AlignedData> {
  return await dataChartWorkerService.run("fetchChartData", m, d);
}
