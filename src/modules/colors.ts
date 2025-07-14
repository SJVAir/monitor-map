import { mix } from "color2k";
import { ValueOf } from "@tstk/types";
export { darken, mix, toHex, readableColor } from "color2k";

export const Colors = {
  white: "ffffff",
  gray: "969696",
  black: "000000",
  blue: "0000FF",
  green: "00e400",
  yellow: "ffff00",
  orange: "ff7e00",
  red: "ff0000",
  purple: "8f3f97",
  maroon: "7e0023"
} as const;

export interface PollutantColorMap {
  min: number;
  color: ValueOf<typeof Colors>;
}

export const ozoneValueColors: Array<PollutantColorMap> = [
  { min: -Infinity, color: Colors.green },
  { min: 55, color: Colors.yellow },
  { min: 71, color: Colors.orange },
  { min: 86, color: Colors.red },
  { min: 106, color: Colors.purple },
  { min: 201, color: Colors.maroon },
];

export function valueToColor(value: number, colors: Array<PollutantColorMap>) {
  const lastLvl = colors[colors.length - 1];

  if (value >= lastLvl.min) {
    return `#${lastLvl.color}`;

  } else if (value <= 0) {
    return `#${colors[0].color}`;

  } else {
    for (let i = 0; i <= colors.length - 1; i++) {
      if (colors[i].min > value) {
        // Level for current value
        const min = colors[i - 1];
        // Level threshold for current value
        const max = colors[i];
        // Difference between max and min values => total steps in level
        const lvlDiff = min.min === -Infinity ? max.min : max.min - min.min;
        // Difference between threshold and current values => steps remaining for current level
        const valDiff = max.min - value;
        // Difference between total steps and steps remaining
        const divisable = lvlDiff - valDiff;
        // Percent of steps used in level
        const diff = divisable / lvlDiff;

        // Color magic
        const newColor = mix(`#${min.color}`, `#${max.color}`, diff);
        return newColor;
      }
    }

    // Gentle way to signify an error
    return "#FFFFFF";
  }
}
