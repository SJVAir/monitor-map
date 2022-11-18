import { ref } from "vue";
import type { IEvStation } from "../types";
import type { Ref } from "vue";

interface EVChargingServiceConfig {
  webworker: boolean;
}

const lvl2EVStations = ref<Array<IEvStation>>([]);
const lvl3EVStations = ref<Array<IEvStation>>([]);
let service: typeof import("./requests") | typeof import("./BackgroundRequests");

export async function useEVChargingService(config?: Partial<EVChargingServiceConfig>) {
  const opts: EVChargingServiceConfig = {
    webworker: config?.webworker || true
  };

  if (!service) {
    service = opts.webworker
      ? await import("./BackgroundRequests")
      : await import("./requests");
  }

  async function fetchLvl2Stations() {
    return await fetchEvStations(lvl2EVStations, service.fetchLvl2Stations);
  }

  async function fetchLvl3Stations() {
    return await fetchEvStations(lvl3EVStations, service.fetchLvl3Stations);
  }

  return {
    ...service,
    fetchLvl2Stations,
    fetchLvl3Stations,
    lvl2EVStations,
    lvl3EVStations
  };
}

async function fetchEvStations(collection: Ref<Array<IEvStation>>, request: () => Promise<Array<IEvStation>>) {
  if (!collection.value.length) {
    await request()
      .then(stations => {
        collection.value = stations;
      })
      .catch(() => console.error("Failed to fetch EV charging stations."));
  }
}
