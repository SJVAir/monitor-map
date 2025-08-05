import { Collocation, getCollocations, setOrigin } from "@sjvair/sdk";
import { apiOrigin } from "../modules/http";

if (!import.meta.env.PROD) {
  setOrigin(apiOrigin);
}

export async function fetchCalibrators(): Promise<Array<Collocation>> {
  return await getCollocations();
}
