import { Singleton } from "@tstk/decorators";
import { getMonitors, getMonitorsLatest, getMonitorsMeta, type MonitorData, type MonitorLatestType, type MonitorsMeta, type SJVAirEntryLevel } from "@sjvair/sdk";
import { TriggerLoadingScreen } from "../load-screen/load-screen.svelte.ts";
import { Derived, Reactive } from "$lib/reactivity.svelte.ts";
import { Initializer } from "$lib/decorators/initializer.ts";
import { asDataURI, circle, square, triangle } from "$lib/map/icons.ts";

const MONITOR_ICONS = { circle, square, triangle };
const MONITOR_ICON_BORDER_WIDTH = 2;

function buildIcons(levels: Array<SJVAirEntryLevel> | null) {
  const defaultColor = "#969696" // light gray
  const icons: Record<string, HTMLImageElement> = {};

  const greySquareIcon = new Image();
  greySquareIcon.src = asDataURI(square(defaultColor, MONITOR_ICON_BORDER_WIDTH));
  greySquareIcon.width = 24;
  greySquareIcon.height = 24;

  icons["default"] = greySquareIcon;

  if (levels) {
    for (const level of levels) {
      for (const [shapeName, shape] of Object.entries(MONITOR_ICONS)) {
        shape
        const icon = new Image();
        icon.src = asDataURI(shape(level.color, MONITOR_ICON_BORDER_WIDTH));
        icon.width = 24;
        icon.height = 24;
        icons[`${level.name}-${shapeName}`] = icon;
      }
    }
  }

  return icons;
}

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

  @Derived(() => {
    const mc = new MonitorsController();
    return mc.meta?.entryType(mc.pollutant ?? mc.meta.default_pollutant).asIter.levels;
  })
  accessor levels!: Array<SJVAirEntryLevel> | null;

  @Derived(() => buildIcons(new MonitorsController().levels))
  accessor icons!: Record<string, HTMLImageElement>;

  @Initializer
  @TriggerLoadingScreen
  async init(): Promise<void> {
    await this.update();
    this.pollutant = this.meta.default_pollutant;
  }

  async update(): Promise<void> {
    [this.meta, this.list] = await Promise.all([
      getMonitorsMeta(),
      getMonitors(),
    ])
    this.latest = await getMonitorsLatest(this.pollutant ?? this.meta.default_pollutant);
  }
}
