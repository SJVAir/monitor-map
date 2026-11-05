import { levelFor, NO_LEVEL, type Level, type Scale } from "@sjvair/map-sdk/data";

/** The color for a reading no level covers, as map-sdk draws an inactive monitor. */
export const NEUTRAL_LEVEL_COLOR = "#969696";

/** The scale level a reading falls in, or null when there is no scale or no level covers it. */
export function readingLevel(
	value: string | number | null | undefined,
	scale: Scale | null
): Level | null {
	if (!scale) return null;
	const level = levelFor(value, scale);
	return level === NO_LEVEL ? null : level;
}
