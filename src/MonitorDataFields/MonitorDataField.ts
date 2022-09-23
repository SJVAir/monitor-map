import { Colors } from "../modules/colors";
import type { MonitorDataFieldName, IColorLevel, IMonitorData} from "../types";

export class MonitorDataField {
  static levels: Array<IColorLevel> = [
    {min: -Infinity, color: Colors.green},
    {min: 12, color: Colors.yellow},
    {min: 35, color: Colors.orange},
    {min: 55, color: Colors.red},
    {min: 150, color: Colors.purple},
    {min: 250, color: Colors.maroon}
  ];

  label: string;
  latest?: number;
  levels = MonitorDataField.levels;
  name: MonitorDataFieldName;
  updateDuration: string;

  constructor(fieldName: MonitorDataFieldName, displayLabel: string, updateDuration: string, data: IMonitorData) {

    this.label = displayLabel;
    this.name = fieldName;
    this.updateDuration = updateDuration;

    if (data.latest && this.name in data.latest) {
      this.latest = Math.round(parseFloat(data.latest[this.name]));
    }
  }
}
