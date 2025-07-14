import { Collocation, getCollocations, setOrigin } from "@sjvair/sdk";
import { baseURL } from "../modules/http";

if (!import.meta.env.PROD) {
  setOrigin("http://127.0.0.1:8000");
} else {
  setOrigin(baseURL)
}

export async function fetchCalibrators(): Promise<Array<Collocation>> {
  return await getCollocations();
}
