import { Singleton } from "@tstk/decorators";
import { getMonitors, getMonitorsLatest, getMonitorsMeta, type MonitorData, type MonitorLatest, type MonitorLatestType, type MonitorsMeta } from "@sjvair/sdk";

function ThrowIfUnset<V, T = unknown>(
  _target: ClassAccessorDecoratorTarget<T, V>,
  ctx: ClassAccessorDecoratorContext,
): ClassAccessorDecoratorResult<T, V> {
  let cached: V;

  return {
    get() {
      if (cached === undefined) {
        throw new Error(`"${ctx.name.toString()}" is not initialized. Call init() first.`);
      }
      return cached;
    },
    set(newValue) {
      cached = newValue;
    },
  };
};

@Singleton
export class MonitorsController {
  meta!: MonitorsMeta;
  list!: Array<MonitorData>;
  active!: Array<MonitorLatestType<"pm25" | "o3">>;

  async init() {
    [this.meta, this.list] = await Promise.all([
      getMonitorsMeta(),
      getMonitors(),
    ])
    this.active = await getMonitorsLatest(this.meta.default_pollutant);
  }
}
