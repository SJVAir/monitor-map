import { ref } from "vue";
import { WorkerServiceClient } from "../Webworkers/WorkerServiceClient";
import EVChargingWorkerService from "./worker?worker";
import { IEvStation } from "../types";

type EVChargingServiceModule = typeof import("./service");

const worker = new EVChargingWorkerService();
const evChargingsWorkerService = new WorkerServiceClient<EVChargingServiceModule>(worker);

export const evStations = ref<Array<IEvStation>>([]);

export async function fetchEvStations() {
  if (evStations.value.length) {
    return evStations;

  } else {
    await evChargingsWorkerService.run("fetchEvStations")
      .then(stations => {
        evStations.value = stations;
      })
      .catch(() => console.error("Failed to fetch EV charging stations."));

    return evStations;
  }
}
