import { CollocationSite, getCollocationSites } from "../modules/api";

export async function fetchCalibrators(): Promise<Array<CollocationSite>> {
  return await getCollocationSites();
}
