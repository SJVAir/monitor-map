import { Singleton, SingleUse } from "@tstk/decorators";
import {
  getMonitors,
  getMonitorsLatest,
  getMonitorsMeta,
  type MonitorData,
  type MonitorLatestType,
  type MonitorsMeta,
  type MonitorType,
  type SJVAirEntryLevel,
} from "@sjvair/sdk";
import { Derived, Reactive } from "$lib/reactivity.svelte.ts";
import { Interval } from "@tstk/utils";

interface MonitorDisplayToggles extends Record<Exclude<MonitorType, "airgradient">, boolean> {
  sjvair: boolean;
  inactive: boolean;
  inside: boolean;
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

@Singleton
export class MonitorsController {
  @Reactive(true)
  accessor meta!: MonitorsMeta;

  @Reactive(true)
  accessor list!: Array<MonitorData>;

  @Reactive(true)
  accessor latest!: Map<string, MonitorLatestType<"pm25" | "o3">>;

  @Reactive()
  accessor pollutant!: "pm25" | "o3";

  @Reactive()
  accessor displayToggles: MonitorDisplayToggles = {
    purpleair: true,
    sjvair: true,
    aqview: true,
    bam1022: true,
    airnow: true,
    inactive: false,
    inside: false
  };

  @Derived(() => {
    const mc = new MonitorsController();
    return mc.meta?.entryType(mc.pollutant ?? mc.meta.default_pollutant).asIter.levels;
  })
  accessor levels!: Array<SJVAirEntryLevel> | null;

  autoUpdate = new Interval(async () => await this.update(), 2 * 60 * 1000)

  get displayOptions(): Record<keyof MonitorDisplayToggles, any> {
    return {
      purpleair: this.meta.monitors["purpleair"].label,
      airnow: this.meta.monitors["airnow"].label,
      aqview: this.meta.monitors["aqview"].label,
      bam1022: "SJVAir FEM",
      sjvair: "SJVAir non-FEM",
      inactive: "Inactive",
      inside: "Inside"
    };
  }

  @SingleUse
  async init(): Promise<void> {
    [this.meta, this.list] = await Promise.all([
      getMonitorsMeta(),
      getMonitors(),
    ])
    this.pollutant = this.meta.default_pollutant;
    this.latest = await getMonitorsLatestMap(this.pollutant);
    this.autoUpdate.start();
  }

  async update(): Promise<void> {
    [this.list, this.latest] = await Promise.all([
      getMonitors(),
      getMonitorsLatestMap(this.pollutant)
    ])

  }
}

