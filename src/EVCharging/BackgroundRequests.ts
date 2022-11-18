import { WorkerServiceClient } from "../Webworkers/WorkerServiceClient";
//import EVChargingWorkerService from "./EVWorker?worker";
//const worker = new EVChargingWorkerService();
// FIXME: https://github.com/vitejs/vite/issues/9566
import EVChargingWorkerServiceURL from "./EVWorker?url";
const worker = new Worker(EVChargingWorkerServiceURL, { type: 'module' })

type EVChargingServiceModule = typeof import("./requests");

const evChargingsWorkerService = new WorkerServiceClient<EVChargingServiceModule>(worker);

export async function fetchLvl2Stations() {
  return await evChargingsWorkerService.run("fetchLvl2Stations");
}

export async function fetchLvl3Stations() {
  return await evChargingsWorkerService.run("fetchLvl3Stations");
}
