import { WorkerServiceClient } from "../Webworkers/WorkerServiceClient";
import EVChargingWorkerService from "./EVWorker?worker";

type EVChargingServiceModule = typeof import("./requests");

const worker = new EVChargingWorkerService();
const evChargingsWorkerService = new WorkerServiceClient<EVChargingServiceModule>(worker);

export async function fetchLvl2Stations() {
  return await evChargingsWorkerService.run("fetchLvl2Stations");
}

export async function fetchLvl3Stations() {
  return await evChargingsWorkerService.run("fetchLvl3Stations");
}
