import { http } from "../modules";
import type { Calibrator } from "./index.d";

export async function fetchCalibrators(): Promise<Array<Calibrator>> {
  return http.get<{ data: Array<Calibrator> }>("/calibrations")
    .then(res => {
      const { data } = res.data;
      return data.length ? data : [];
    });
}
