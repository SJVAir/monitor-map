import { startOfPacificDay } from "@sjvair/sdk/datetime/pacific";

/** The chart's zone: times and days are Pacific, whatever zone the device is in. */
export const PACIFIC_TIME_ZONE = "America/Los_Angeles";

/**
 * The x-axis end: `now` when the data ends earlier on the current Pacific day (so the axis
 * reaches the present), else the data's end. Both are Unix seconds.
 */
export function chartRangeMax(max: number, now: Date = new Date()): number {
	const end = new Date(max * 1000);
	const today = startOfPacificDay(end).getTime() === startOfPacificDay(now).getTime();
	return today && now > end ? Math.floor(now.getTime() / 1000) : max;
}

const formatter = new Intl.DateTimeFormat("en-US", {
	timeZone: PACIFIC_TIME_ZONE,
	month: "short",
	day: "numeric",
	year: "numeric",
	hour: "numeric",
	minute: "2-digit"
});

/** A Unix time as Pacific wall-clock time, e.g. "Nov 4, 2026 8:05 PM". */
export function formatPacificTime(unixSeconds: number): string {
	const part = Object.fromEntries(
		formatter.formatToParts(new Date(unixSeconds * 1000)).map((p) => [p.type, p.value])
	);
	return `${part.month} ${part.day}, ${part.year} ${part.hour}:${part.minute} ${part.dayPeriod}`;
}
