import { mix } from "color2k";

export interface ColorMap {
	min: number;
	color: string;
}

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

export function valueToColor(value: number, colors: ColorMap[]): string {
	if (value >= colors[colors.length - 1].min) {
		return `#${colors[colors.length - 1].color}`;
	}

	if (value <= 0) {
		return `#${colors[0].color}`;
	}

	for (let i = 0; i < colors.length - 1; i++) {
		if (colors[i + 1].min > value) {
			const min = colors[i];
			const max = colors[i + 1];
			const lvlDiff = min.min === -Infinity ? max.min : max.min - min.min;
			const diff = (lvlDiff - (max.min - value)) / lvlDiff;
			return mix(`#${min.color}`, `#${max.color}`, diff);
		}
	}

	return "#FFFFFF";
}
