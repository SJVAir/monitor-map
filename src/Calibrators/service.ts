import { ref } from "vue";
import * as CalibratorsService from "./BackgroundRequests";
import { Monitor } from "../Monitors";
import type { Calibrator } from "./index.d";

const calibrators = ref<Array<Calibrator>>([]);

export async function useCalibratorsService() {
  return {
    calibrators,
    fetchCalibrators,
  };
}

async function fetchCalibrators() {
  if (!calibrators.value.length) {
    await CalibratorsService.fetchCalibrators()
      .then(res => {
        calibrators.value = res.length ? res : [];
      })
      .catch(() => console.error("Failed to fetch Calibrators."));
  }
}

export function getCalibratorById(id: string): Calibrator | undefined {
  return calibrators.value.find(c => c.id === id);
}

export function getCalibratorByRefId(id: string): Calibrator | undefined {
  return calibrators.value.find(c => c.reference_id === id);
}

export function isCalibrator(monitor: Monitor | string): boolean {
  return (typeof monitor === "string")
    ? calibrators.value.some(c => c.id === monitor)
    : calibrators.value.some(c => c.id === monitor.data.id);
}

export function monitorIsCalibrator(monitor: Monitor | string): boolean {
  return (typeof monitor === "string")
    ? calibrators.value.some(c => c.reference_id === monitor)
    : calibrators.value.some(c => c.reference_id === monitor.data.id);
}
