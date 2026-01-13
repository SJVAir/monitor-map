import {
  getMonitors,
  getMonitorsLatest,
  getMonitorsMeta,
  type MonitorData,
  type MonitorLatestType,
  type MonitorsMeta,
  type SJVAirEntryLevel
} from "@sjvair/sdk";
import type { PageLoad } from './$types';

export interface MapLoadData {
  monitors: MonitorsMapData;
}

export interface MonitorsMapData {
  meta: MonitorsMeta;
  latest: Map<string, MonitorLatestType<"pm25" | "o3">>;
  list: Array<MonitorData>;
}

export const load: PageLoad = async ({ params, }): Promise<MapLoadData> => {
  try {
    return {
      monitors: await getMonitorsMapData(),
    }
  } catch (error) {
    throw new Error('Failed to load monitors data');
  }
};

async function getMonitorsMapData(): Promise<MonitorsMapData> {
  const [meta, list] = await Promise.all([getMonitorsMeta(), getMonitors()]);
  const monitors = await getMonitorsLatest(meta.default_pollutant);
  const latest = new Map<string, MonitorLatestType<"pm25" | "o3">>();

  for (const monitor of monitors) {
    latest.set(monitor.id, monitor);
  }

  return {
    meta,
    latest,
    list
  };
}
