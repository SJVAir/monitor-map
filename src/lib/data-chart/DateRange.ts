import { addPacificDays, endOfPacificDay, startOfPacificDay } from "@sjvair/sdk/datetime/pacific";
import type { DateValue } from "@internationalized/date";

/** ISO instants. Days are Pacific days, whatever zone the device is in. */
export type DateRange = { start: string; end: string };

/** An instant on the given calendar day in Pacific time (noon UTC is 4–5 AM Pacific). */
function onPacificDay(day: DateValue): Date {
	return new Date(Date.UTC(day.year, day.month - 1, day.day, 12));
}

function samePacificDay(a: Date, b: Date): boolean {
	return startOfPacificDay(a).getTime() === startOfPacificDay(b).getTime();
}

/**
 * The chart's range: with no days picked, the start of yesterday through now; otherwise the
 * whole picked days, ending now when the end day is today.
 */
export function createDateRange(start?: DateValue, end?: DateValue, now = new Date()): DateRange {
	if (!start || !end) {
		return {
			start: startOfPacificDay(addPacificDays(now, -1)).toISOString(),
			end: now.toISOString()
		};
	}

	const endDay = onPacificDay(end);
	return {
		start: startOfPacificDay(onPacificDay(start)).toISOString(),
		end: (samePacificDay(endDay, now) ? now : endOfPacificDay(endDay)).toISOString()
	};
}

/** Whether the range ends on the current Pacific day, i.e. it can still gain entries. */
export function includesToday(range: DateRange, now = new Date()): boolean {
	return samePacificDay(new Date(range.end), now);
}

/** The same range with its end moved to the present. */
export function extendToNow(range: DateRange, now = new Date()): DateRange {
	return { start: range.start, end: now.toISOString() };
}

const PACIFIC = "America/Los_Angeles";
const shortDay = new Intl.DateTimeFormat("en-US", {
	timeZone: PACIFIC,
	month: "short",
	day: "numeric"
});
const shortDayYear = new Intl.DateTimeFormat("en-US", {
	timeZone: PACIFIC,
	month: "short",
	day: "numeric",
	year: "numeric"
});
const fileDayParts = new Intl.DateTimeFormat("en-US", {
	timeZone: PACIFIC,
	day: "2-digit",
	month: "short",
	year: "numeric"
});

/** The range's Pacific days for display, e.g. "Nov 3 – Nov 4, 2026". */
export function dateRangeLabel(range: DateRange): string {
	return `${shortDay.format(new Date(range.start))} – ${shortDayYear.format(new Date(range.end))}`;
}

/** An instant's Pacific day for a file name, e.g. "04.Nov.2026". */
export function fileDay(iso: string): string {
	const parts = Object.fromEntries(
		fileDayParts.formatToParts(new Date(iso)).map((part) => [part.type, part.value])
	);
	return `${parts.day}.${parts.month}.${parts.year}`;
}
