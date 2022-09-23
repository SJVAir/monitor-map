import { dateUtil } from "../modules";
import type { ChartDataField, IMonitorEntry, MonitorFieldColor } from "../types";

export class ChartDataPoint {
  color: MonitorFieldColor;
  fieldName: ChartDataField;
  xData: any;
  yData: number;

  constructor(color: MonitorFieldColor, fieldName: ChartDataField, entry: IMonitorEntry) {
    // TODO-PERF: How to not convert every date
    this.color = color;
    this.fieldName = fieldName;
    this.xData = dateUtil.dayjs.utc(entry.timestamp).tz('America/Los_Angeles').toISOString();
    this.yData = parseFloat(entry[fieldName]);
  }
}
