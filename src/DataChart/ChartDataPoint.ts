import type { ChartDataField, MonitorFieldColor } from "../types";

export class ChartDataPoint {
  color: MonitorFieldColor;
  fieldName: ChartDataField;
  yData: number | null;

  constructor(color: MonitorFieldColor, fieldName: ChartDataField, yData: string | null) {
    this.color = color;
    this.fieldName = fieldName;
    this.yData = (yData === null) ? yData : parseFloat(yData);
  }
}
