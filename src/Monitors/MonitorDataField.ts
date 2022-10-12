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


export function getDataFields(data: IMonitorData) {
    switch (data.device) {
      case "AirNow":
        return airNowDataFields(data);

      case "BAM1022":
        return bam1022DataFields(data);

      case "PurpleAir":
        return purpleAirDataFields(data);
    }
}

function genMulti(...fieldDefinitions: Array<ConstructorParameters<typeof MonitorDataField>>) {
  const fields = {} as Record<MonitorDataFieldName, MonitorDataField>;

  for (let def of fieldDefinitions) {
    fields[def[0]] = new MonitorDataField(...def);
  }

  return fields;
}

function airNowDataFields(data: IMonitorData) {
  return genMulti(
      ["pm25", "PM 2.5", "60m", data],
      ["pm100", "PM 10", "60M", data]
    );
}

function bam1022DataFields(data: IMonitorData) {
  return genMulti(
      ["pm25", "PM 2.5", "60m", data]
    );
}

function purpleAirDataFields(data: IMonitorData) {
  return genMulti(
      ["pm10", "PM 1.0", "2m", data],
      ["pm25", "PM 2.5", "2m", data],
      ["pm25_avg_15", "PM 2.5", "15m", data],
      ["pm25_avg_60", "PM 2.5", "60m", data],
      ["pm100", "PM 10", "", data]
    );
}
