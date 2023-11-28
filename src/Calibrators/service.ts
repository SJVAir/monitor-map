import { ref } from "vue";
import * as CalibratorsService from "./BackgroundRequests";
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
