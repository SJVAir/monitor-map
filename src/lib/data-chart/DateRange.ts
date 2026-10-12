import { subDays, startOfDay, endOfDay, isToday, parseISO } from "date-fns";
import type { DateValue } from "@internationalized/date";

export type DateRange = { start: string; end: string };

export function createDateRange(start?: DateValue, end?: DateValue): DateRange {
	if (!start || !end) {
		return {
			start: startOfDay(subDays(new Date(), 1)).toISOString(),
			end: new Date().toISOString()
		};
	}

	const startDate = startOfDay(new Date(start.year, start.month - 1, start.day));
	let endDate = new Date(end.year, end.month - 1, end.day);
	endDate = isToday(endDate) ? new Date() : endOfDay(endDate);

	return {
		start: startDate.toISOString(),
		end: endDate.toISOString()
	};
}

/** Whether the range ends on the current calendar day, i.e. it can still gain entries. */
export function includesToday(range: DateRange): boolean {
	return isToday(parseISO(range.end));
}

/** The same range with its end moved to the present. */
export function extendToNow(range: DateRange): DateRange {
	return { start: range.start, end: new Date().toISOString() };
}
