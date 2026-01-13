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

export const monitorsState: MonitorsState = $state({
  autoUpdate: new Interval(async () => await update(), 2 * 60 * 1000),
  initialized: false,
  latest: new XMap(),
  list: null,
  meta: null,
  pollutant: null,
  displayOptions: {
    purpleair: {
      label: "PurpleAir",
      value: true
    },
    sjvair: {
      label: "SJVAir non-FEM",
      value: true
    },
    aqview: {
      label: "AQview",
      value: true
    },
    bam1022: {
      label: "SJVAir FEM",
      value: true
    },
    airnow: {
      label: "AirNow",
      value: true
    },
    inactive: {
      label: "Inactive",
      value: false
    },
    inside: {
      label: "Inside",
      value: false
    }
  }
})

const levels: Array<SJVAirEntryLevel> | null = $derived(monitorsState.meta?.entryType(monitorsState.pollutant ?? monitorsState.meta.default_pollutant).asIter.levels || null);
export function getCurrentLevels(): Array<SJVAirEntryLevel> | null {
  return levels;
}

export async function init(): Promise<void> {
  if (monitorsState.initialized) return;

  [monitorsState.meta, monitorsState.list] = await Promise.all([getMonitorsMeta(), getMonitors()]);

  monitorsState.pollutant = monitorsState.meta.default_pollutant;
  monitorsState.latest = await getMonitorsLatestMap(monitorsState.pollutant);
  monitorsState.autoUpdate.start();
  monitorsState.initialized = true;
}

export async function update(): Promise<void> {
  if (!monitorsState.initialized) return;

  [monitorsState.list, monitorsState.latest] = await Promise.all([
    getMonitors(),
    getMonitorsLatestMap(monitorsState.pollutant || monitorsState.meta?.default_pollutant || "pm25")
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

