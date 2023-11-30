import { WorkerServiceClient } from "../Webworkers/WorkerServiceClient";
import CalibratorsWorkerService from "./CalibratorsWorker?worker";
const worker = new CalibratorsWorkerService();
// FIXME: https://github.com/vitejs/vite/issues/9566
//import EVChargingWorkerServiceURL from "./EVWorker?url";
//const worker = new Worker(EVChargingWorkerServiceURL, { type: 'module' })

type CalibratorsServiceModule = typeof import("./requests");

const calibratorsWorkerService = new WorkerServiceClient<CalibratorsServiceModule>(worker);

export async function fetchCalibrators() {
  return await calibratorsWorkerService.run("fetchCalibrators");
}

