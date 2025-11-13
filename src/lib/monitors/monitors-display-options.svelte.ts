import { Reactive } from "$lib/reactivity.svelte.ts";
import type { MonitorType } from "@sjvair/sdk";
import { Singleton } from "@tstk/decorators";

type MonitorDisplayOptionsType = Record<Exclude<MonitorType, "airgradient"> | "sjvair" | "inactive" | "inside", {
  label: string;
  value: boolean;
}>;

type OtherMonitorDisplayOptionsType = Array<{
  label: string;
  value: boolean;
}>;

@Singleton
export class MonitorsDisplayOptions {
  @Reactive()
  accessor enableClusters: boolean = true;

  @Reactive()
  accessor clusterMode: "circles" | "monitorType" | "shapes" = "monitorType";

  @Reactive()
  accessor shapeStyle: string = "billiards";

  @Reactive()
  accessor options: MonitorDisplayOptionsType = {
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
  };

  @Reactive()
  accessor otherOptions: OtherMonitorDisplayOptionsType = [
    {
      label: "PurpleAir",
      value: true
    },
    {
      label: "SJVAir non-FEM",
      value: true
    },
    {
      label: "AQview",
      value: true
    },
    {
      label: "SJVAir FEM",
      value: true
    },
    {
      label: "AirNow",
      value: true
    },
    {
      label: "Inactive",
      value: false
    },
    {
      label: "Inside",
      value: false
    }
  ];
}
