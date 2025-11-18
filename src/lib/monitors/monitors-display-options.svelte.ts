import type { MonitorType } from "@sjvair/sdk";

interface MonitorDisplayToggles extends Record<Exclude<MonitorType, "airgradient">, boolean> {
  sjvair: boolean;
  inactive: boolean;
  inside: boolean;
}

type MonitorDisplayOptionsType = Record<
  Exclude<MonitorType, "airgradient"> | "sjvair" | "inactive" | "inside",
  {
    label: string;
    value: boolean;
  }
>;

type OtherMonitorDisplayOptionsType = Array<{
  label: string;
  value: boolean;
}>;

export class MonitorsDisplayOptions {
  static instance: MonitorsDisplayOptions;

  enableClusters: boolean = $state(true);

  clusterMode: "circles" | "monitorType" | "shapes" = $state("monitorType");

  shapeStyle: string = $state("billiards");

  //displayOptions: Record<keyof MonitorDisplayToggles, any> = $derived({
  //  purpleair: this.meta?.monitors["purpleair"].label,
  //  airnow: this.meta?.monitors["airnow"].label,
  //  aqview: this.meta?.monitors["aqview"].label,
  //  bam1022: "SJVAir FEM",
  //  sjvair: "SJVAir non-FEM",
  //  inactive: "Inactive",
  //  inside: "Inside"
  //})


  options: MonitorDisplayOptionsType = $state({
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
  });

  otherOptions: OtherMonitorDisplayOptionsType = $state([
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
  ]);

  constructor() {
    if (MonitorsDisplayOptions.instance) {
      return MonitorsDisplayOptions.instance;
    }
    MonitorsDisplayOptions.instance = this;
  }
}
