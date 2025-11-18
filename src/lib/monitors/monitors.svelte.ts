import {
  getMonitors,
  getMonitorsLatest,
  getMonitorsMeta,
  type MonitorData,
  type MonitorLatestType,
  type MonitorsMeta,
  type SJVAirEntryLevel
} from "@sjvair/sdk";
import { XMap } from "@tstk/builtin-extensions";
import { Interval } from "@tstk/utils";

//export class MonitorsController { }
interface MonitorsState {
  autoUpdate: Interval;
  initialized: boolean;
  latest: Map<string, MonitorLatestType<"pm25" | "o3">>;
  list: Array<MonitorData> | null;
  meta: MonitorsMeta | null;
  pollutant: "pm25" | "o3" | null;
}

export const state: MonitorsState = $state({
  autoUpdate: new Interval(async () => await update(), 2 * 60 * 1000),
  initialized: false,
  latest: new XMap(),
  list: null,
  meta: null,
  pollutant: null
})

export const levels: Array<SJVAirEntryLevel> | null = $derived.by(() => {
  return state.meta?.entryType(state.pollutant ?? state.meta.default_pollutant).asIter.levels || null;
});

export async function init(): Promise<void> {
  if (state.initialized) return;

  [state.meta, state.list] = await Promise.all([getMonitorsMeta(), getMonitors()]);

  state.pollutant = state.meta.default_pollutant;
  state.latest = await getMonitorsLatestMap(state.pollutant);
  state.autoUpdate.start();
  state.initialized = true;
}

export async function update(): Promise<void> {
  if (!state.initialized) return;

  [state.list, state.latest] = await Promise.all([
    getMonitors(),
    getMonitorsLatestMap(state.pollutant || state.meta?.default_pollutant || "pm25")
  ]);
}

async function getMonitorsLatestMap(
  pollutant: "pm25" | "o3"
): Promise<Map<string, MonitorLatestType<"pm25" | "o3">>> {
  const monitors = await getMonitorsLatest(pollutant);
  const latest = new Map<string, MonitorLatestType<"pm25" | "o3">>();

  for (const monitor of monitors) {
    latest.set(monitor.id, monitor);
  }

  return latest;
}

