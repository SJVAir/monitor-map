import { Derived, Reactive } from "$lib/reactivity.svelte.ts";
import type { MonitorType } from "@sjvair/sdk";
import { MonitorsController } from "./monitors.svelte.ts";
import { Singleton } from "@tstk/decorators";

type MonitorDisplayOptionsType = Record<Exclude<MonitorType, "airgradient"> | "inactive" | "inside", {
  label: string;
  value: boolean;
}>;

@Singleton
export class MonitorDisplayOptions {
  @Reactive()
  accessor enableClusters: boolean = true;

  @Reactive()
  accessor clusterMode: "circles" | "monitorType" | "shapes" = "monitorType";

  @Reactive()
  accessor shapeStyle: string = "billiards";

  @Derived(() => {
    const mc = new MonitorsController();
    return {
      purpleair: {
        label: mc.meta.monitors["purpleair"].label,
        value: true
      },
      sjvair: {
        label: "SJVAir non-FEM",
        value: true
      },
      aqview: {
        label: mc.meta.monitors["aqview"].label,
        value: true
      },
      bam1022: {
        label: "SJVAir FEM",
        value: true
      },
      airnow: {
        label: mc.meta.monitors["airnow"].label,
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
  accessor options!: MonitorDisplayOptionsType;
}
