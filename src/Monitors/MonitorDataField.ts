import type { MonitorLatest } from "@sjvair/sdk";
import { Colors } from "../modules/colors";
import type { MonitorDataFieldName, IColorLevel } from "../types";

export class MonitorDataField {
  static levels: Array<IColorLevel> = [
    { min: -Infinity, color: Colors.green },
    { min: 12, color: Colors.yellow },
    { min: 35, color: Colors.orange },
    { min: 55, color: Colors.red },
    { min: 150, color: Colors.purple },
    { min: 250, color: Colors.maroon }
  ];

  label: string;
  latest?: number;
  levels = MonitorDataField.levels;
  name: MonitorDataFieldName;
  updateDuration: string;

  constructor(fieldName: MonitorDataFieldName, displayLabel: string, updateDuration: string, data: MonitorLatest<"pm25" | "o3">) {

    this.label = displayLabel;
    this.name = fieldName;
    this.updateDuration = updateDuration;

    if (data.latest && this.name in data.latest) {
      this.latest = Math.round(parseFloat(data.latest.value));
    }
  }
}


export function getDataFields(data: MonitorLatest<"pm25" | "o3">) {
  switch (data.data_source.name) {
    case "AirNow.gov":
      return airNowDataFields(data);

    case "AQview":
      return aqviewDataFields(data);

    case "Central California Asthma Collaborative":
      return bam1022DataFields(data);

    case "PurpleAir":
    case "AirGradient":
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

function airNowDataFields(data: MonitorLatest<"pm25" | "o3">) {
  return genMulti(
    ["pm25", "PM 2.5", "60m", data],
    ["pm100", "PM 10", "60M", data]
  );
}

function aqviewDataFields(data: MonitorLatest<"pm25" | "o3">) {
  return genMulti(
    ["pm25_avg_60", "PM 2.5", "60m", data]
  );
}

function bam1022DataFields(data: MonitorLatest<"pm25" | "o3">) {
  return genMulti(
    ["pm25", "PM 2.5", "60m", data]
  );
}

function purpleAirDataFields(data: MonitorLatest<"pm25" | "o3">) {
  return genMulti(
    ["pm10", "PM 1.0", "2m", data],
    ["pm25", "PM 2.5", "2m", data],
    ["pm25_avg_15", "PM 2.5", "15m", data],
    ["pm25_avg_60", "PM 2.5", "60m", data],
    ["pm100", "PM 10", "", data]
  );
}
