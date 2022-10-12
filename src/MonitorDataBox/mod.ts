import { Colors, valueToColor } from "../modules";
import { darken, readableColor, toHex } from "color2k";
import type { Monitor } from "../Monitors";

const humidityColors = [
  { min: -Infinity, color: "fecf22" },
  { min: 95, color: "0079c1" }
];

const tempLevels = [
  { min: -Infinity, color: Colors.blue },
  { min: 65, color: Colors.green },
  { min: 78, color: Colors.yellow },
  { min: 95, color: Colors.red }
];

// humidity color #198ccd
export function rhDataboxStyles(monitor: Monitor) {
  const rhColor = valueToColor(+monitor.data.latest.humidity, humidityColors);
  return {
    backgroundColor: rhColor,
    color: readableColor(rhColor),
    border: `solid ${ toHex(darken(rhColor, .1)) } 3px`
  };
};

export function tempDataboxStyles(value: number) {
  const tempColor = valueToColor(value, tempLevels);
  return {
    backgroundColor: tempColor,
    color: readableColor(tempColor),
    border: `solid ${ toHex(darken(tempColor, .1)) } 3px`
  };
};
