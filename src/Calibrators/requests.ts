import { Collocation, getCollocations, setOrigin } from "@sjvair/sdk";

if (!import.meta.env.PROD) {
  setOrigin("http://127.0.0.1:8000");
}

export async function fetchCalibrators(): Promise<Array<Collocation>> {
  return await getCollocations();
}
