import { MonitorsRecord } from "../types";
import {Monitor} from "./Monitor";
import { fetchMonitors } from "./service";

export let monitors: Record<string, Monitor> = {};

export async function tempFetchMonitors() {
  monitors = await fetchMonitors();
}
