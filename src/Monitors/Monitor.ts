import { MonitorDataField, getDataFields } from "./MonitorDataField";
import { Colors, dateUtil, darken, toHex, valueToColor } from "../modules";
import type { ChartDataField, IMarkerParams, IMonitor, IMonitorData, MonitorDataFieldName } from "../types";

export const MonitorDisplayField = "pm25_avg_15" as const;

export class Monitor implements IMonitor {
  data: IMonitorData;
  dataFields: Array<ChartDataField>;
  displayField: MonitorDataField;
  lastUpdated: string;
  markerParams: IMarkerParams;
  monitorFields!: Record<MonitorDataFieldName, MonitorDataField>;

  constructor(monitorData: IMonitorData) {
    this.data = monitorData;
    this.markerParams = getMarkerParams(monitorData);
    this.monitorFields = getDataFields(monitorData);

    this.dataFields = Object.keys(this.monitorFields) as Array<ChartDataField>;
    this.displayField = this.monitorFields[MonitorDisplayField];
    this.lastUpdated = (monitorData.latest && Object.keys(monitorData.latest).length > 1)
      ? dateUtil(monitorData.latest.timestamp).fromNow()
      : "never";
  }
}

function getMarkerParams(monitorData: IMonitorData): IMarkerParams {
  const fill_color = `#${Colors.gray}`;
  const params: IMarkerParams = {
    border_color: toHex(darken(fill_color, .1)),
    border_size: 1,
    fill_color,
    value_color: fill_color,
    size: 8, //monitorData.is_active ? 16 : 6,
    shape: 'square'
  }

  switch(monitorData.device) {
    case "AirNow": 
    case "BAM1022":
      params.shape = "triangle";
      break;
    case "PurpleAir":
      (monitorData.is_sjvair) && (params.shape = "circle");
      break;
    default:
      console.error(`Unknown device type for monitor ${ monitorData.id }`);
      params.shape = "diamond";
  }

  if (monitorData.latest) {
    const valueColor = valueToColor(+monitorData.latest[MonitorDisplayField], MonitorDataField.levels);
    params.value_color = valueColor;

    if (monitorData.is_active) {
      params.fill_color = valueToColor(+monitorData.latest[MonitorDisplayField], MonitorDataField.levels);
      params.border_color = toHex(darken(params.fill_color, .1));

      switch(monitorData.device) {
        case "AirNow": 
        case "BAM1022":
          params.size = 14;
          break;
        case "PurpleAir":
          if (monitorData.is_sjvair) {
            params.size = 16
          } else {
            params.size = 10;
          }
          break;
      }
    }

    if (monitorData.location === "inside"){
      params.border_color = `#${ Colors.black }`;
      params.border_size = 2;
    }
  }

  return params;
}
