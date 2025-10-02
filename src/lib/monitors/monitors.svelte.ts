import { Singleton } from "@tstk/decorators";
import { getMonitors, getMonitorsLatest, getMonitorsMeta, type MonitorData, type MonitorLatestType, type MonitorsMeta } from "@sjvair/sdk";
import { TriggerLoadingScreen } from "../load-screen/load-screen.svelte.ts";
import { Reactive } from "$lib/reactivity.svelte.ts";
import { Initializer } from "$lib/decorators/initializer.ts";

@Singleton
export class MonitorsController {
  @Reactive(true)
  accessor meta!: MonitorsMeta;

  @Reactive(true)
  accessor list!: Array<MonitorData>;

  @Reactive(true)
  accessor latest!: Array<MonitorLatestType<"pm25" | "o3">>;

  @Reactive()
  accessor pollutant!: "pm25" | "o3";

  @Initializer
  async init(): Promise<void> {
    await this.update();
    this.pollutant = this.meta.default_pollutant;
  }

  @TriggerLoadingScreen
  async update(): Promise<void> {
    [this.meta, this.list] = await Promise.all([
      getMonitorsMeta(),
      getMonitors(),
    ])
    this.latest = await getMonitorsLatest(this.pollutant ?? this.meta.default_pollutant);
  }
}
