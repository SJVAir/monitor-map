import type { Scale } from "@sjvair/map-sdk/data";

/** Color stops for a chart: each level's lower bound and its hex color without the `#`. */
export type LevelColors = Array<[number, string]>;

/** The chart's color stops from a range scale; a level with no lower bound or color is skipped. */
export function levelColors(scale: Scale | null): LevelColors {
	return (scale?.levels ?? []).flatMap((level): LevelColors => {
		if (level.min === null || !level.color) return [];
		return [[level.min, level.color.replace(/^#/, "")]];
	});
}
