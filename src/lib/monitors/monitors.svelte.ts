import { Singleton } from "@tstk/decorators";
import {
  getMonitors,
  getMonitorsLatest,
  getMonitorsMeta,
  type MonitorData,
  type MonitorLatestType,
  type MonitorsMeta,
  type MonitorType,
  type SJVAirEntryLevel,
  type SJVAirMonitorDeviceMeta
} from "@sjvair/sdk";
import { Derived, Reactive } from "$lib/reactivity.svelte.ts";
import { Initializer } from "$lib/decorators/initializer.ts";
import { asDataURI, circle, square, triangle } from "$lib/map/icons.ts";
import type { FilterSpecification } from "@maptiler/sdk";

interface MonitorDisplayOptions extends Record<MonitorType, boolean> {
  sjvairPurpleair: boolean;
  inactive: boolean;
  inside: boolean;
}

const MONITOR_ICONS = { circle, square, triangle };
const MONITOR_ICON_BORDER_WIDTH = 2;

function buildIcons(levels: Array<SJVAirEntryLevel> | null) {
  const defaultColor = "#969696" // light gray
  const icons: Record<string, HTMLImageElement> = {};
  //const icons: Record<string, Blob> = {};

  const greySquareIcon = new Image();
  greySquareIcon.src = asDataURI(square(defaultColor, MONITOR_ICON_BORDER_WIDTH));
  greySquareIcon.width = 24;
  greySquareIcon.height = 24;
  //const greySquareIcon = new Blob([square(defaultColor, MONITOR_ICON_BORDER_WIDTH)], { type: "image/svg+xml" });

  icons["default"] = greySquareIcon;

  if (levels) {
    for (const location of ["inside", "outside"]) {
      for (const level of levels) {
        for (const [shapeName, shape] of Object.entries(MONITOR_ICONS)) {
          const icon = new Image();
          icon.src = asDataURI(shape(
            level.color,
            MONITOR_ICON_BORDER_WIDTH,
            (location === "inside") ? "#000000" : undefined
          ));
          icon.width = 24;
          icon.height = 24;
          icons[`${location}-${level.name}-${shapeName}`] = icon;
        }
        //const blob = new Blob([shape(level.color, MONITOR_ICON_BORDER_WIDTH)], { type: "image/svg+xml" });
        //icons[`${level.name}-${shapeName}`] = blob;
      }
    }
  }

  return icons;
}

const filters = {
  monitor(deviceType: MonitorType) {
    return ["==", ["get", "type"], deviceType]
  },
  purpleair() {
    return ["all", ["==", ["get", "type"], "purpleair"], ["==", ["get", "is_sjvair"], false]]
  },
  sjvPurpleair() {
    return ["all", ["==", ["get", "type"], "purpleair"], ["==", ["get", "is_sjvair"], true]]
  },
};

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

  @Reactive()
  accessor displayOptions: MonitorDisplayOptions = {
    airgradient: true,
    purpleair: true,
    sjvairPurpleair: true,
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

  @Derived(() => buildIcons(new MonitorsController().levels))
  accessor icons!: Record<string, HTMLImageElement>;
  //accessor icons!: Record<string, Blob>;

  @Derived(() => {
    const monitorFilters: Array<any> = ["any"];
    const locationFilters: Array<any> = ["any", ["==", ["get", "location"], "outside"]];
    const mc = new MonitorsController();
    if (mc.displayOptions.airgradient) monitorFilters.push(filters.monitor("airgradient"));
    if (mc.displayOptions.purpleair) monitorFilters.push(filters.purpleair());
    if (mc.displayOptions.aqview) monitorFilters.push(filters.monitor("aqview"));
    if (mc.displayOptions.bam1022) monitorFilters.push(filters.monitor("bam1022"));
    if (mc.displayOptions.airnow) monitorFilters.push(filters.monitor("airnow"));
    if (mc.displayOptions.sjvairPurpleair) monitorFilters.push(filters.sjvPurpleair());
    if (mc.displayOptions.inside) locationFilters.push(["==", ["get", "location"], "inside"]);

    return ["all", monitorFilters, locationFilters];
  })
  accessor filters!: FilterSpecification;

  @Initializer
  async init(): Promise<void> {
    console.log(this.displayOptions);
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
