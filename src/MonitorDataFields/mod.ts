import { MonitorDataField } from "./MonitorDataField";
import type { MonitorDataFieldName, IMonitorData} from "../types";

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
