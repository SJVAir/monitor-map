import { MonitorDataField, getDataFields } from "./MonitorDataField";
import { Colors, dateUtil, darken, toHex, valueToColor, ozoneValueColors } from "../modules";
import type { ChartDataField, IMarkerParams, MonitorDataFieldName } from "../types";
import type { MonitorLatest } from "@sjvair/sdk";

export const MonitorDisplayField = "pm25" as const;

export class Monitor {
  data: MonitorLatest<"pm25" | "o3">;
  dataFields: Array<ChartDataField>;
  displayField: MonitorDataField;
  lastUpdated: string;
  markerParams: IMarkerParams;
  monitorFields!: Record<MonitorDataFieldName, MonitorDataField>;

  constructor(monitorData: MonitorLatest<"pm25" | "o3">) {
    const monitorFields = getDataFields(monitorData)

    if (monitorData.latest) {
      if (parseInt(monitorData.latest.value, 10) < 0) {
        monitorData.latest.value = "0";
      }
    }

    this.data = monitorData;
    this.markerParams = getMarkerParams(monitorData);
    this.monitorFields = monitorFields;

    this.dataFields = Object.keys(this.monitorFields) as Array<ChartDataField>;
    this.displayField = monitorFields[MonitorDisplayField];
    this.lastUpdated = (monitorData.latest && Object.keys(monitorData.latest).length > 1)
      ? dateUtil(monitorData.latest.timestamp).fromNow()
      : "never";
  }
}

function getMarkerParams(monitorData: MonitorLatest<"pm25" | "o3">): IMarkerParams {
  const colorMap = monitorData.latest.entry_type === "pm25" ? MonitorDataField.levels : ozoneValueColors;
  const fill_color = `#${Colors.gray}`;
  const params: IMarkerParams = {
    border_color: toHex(darken(fill_color, .1)),
    border_size: 1,
    fill_color,
    value_color: fill_color,
    size: 8, //monitorData.is_active ? 16 : 6,
    shape: 'square'
  }

  switch (monitorData.data_source.name) {
    case "AirNow.gov":
    case "AQview":
    case "Central California Asthma Collaborative":
      params.shape = "triangle";
      break;
    case "PurpleAir":
      (monitorData.is_sjvair) && (params.shape = "circle");
      break;
    default:
      console.error(`Unknown device type for monitor ${monitorData.id}: ${monitorData.data_source.name}`, monitorData);
      params.shape = "diamond";
  }

  if (monitorData.latest) {
    const valueColor = valueToColor(+monitorData.latest.value, colorMap);
    params.value_color = valueColor;

    if (monitorData.is_active) {
      params.fill_color = valueToColor(+monitorData.latest.value, colorMap);
      params.border_color = monitorData.latest.entry_type === "pm25"
        ? toHex(darken(params.fill_color, .1))
        : `#${Colors.blue}`;

      switch (monitorData.data_source.name) {
        case "AirNow.gov":
        case "AQview":
        case "Central California Asthma Collaborative":
          params.size = 14;
          break;
        case "PurpleAir":
          if (monitorData.is_sjvair) {
            params.size = 12
          } else {
            params.size = 10;
          }
          break;
      }
    }

    if (monitorData.location === "inside") {
      params.border_color = `#${Colors.black}`;
      params.border_size = 2;
    }
  }

  return params;
}
