import { ref } from "vue";
import * as CalibratorsService from "./BackgroundRequests";
import { Monitor } from "../Monitors";
import type { Collocation } from "@sjvair/sdk";

const calibrators = ref<Array<Collocation>>([]);

export async function useCalibratorsService() {
  return {
    calibrators,
    fetchCalibrators,
  };
}

async function fetchCalibrators() {
  if (!calibrators.value.length) {
    await CalibratorsService.fetchCalibrators()
      .then(collocations => {
        calibrators.value = collocations.length ? collocations : [];
      })
      .catch(() => console.error("Failed to fetch Calibrators."));
  }
}

export function getCalibratorById(id: string): Collocation | undefined {
  return calibrators.value.find(c => c.id === id);
}

export function getCalibratorByRefId(id: string): Collocation | undefined {
  return calibrators.value.find(c => c.reference_id === id);
}

export function isCalibratorObject(monitor: Monitor | string): boolean {
  return (typeof monitor === "string")
    ? calibrators.value.some(c => c.id === monitor)
    : calibrators.value.some(c => c.id === monitor.data.id);
}

export function monitorIsCalibrator(monitor: Monitor | string): boolean {
  return (typeof monitor === "string")
    ? calibrators.value.some(c => c.reference_id === monitor)
    : calibrators.value.some(c => c.reference_id === monitor.data.id);
}
