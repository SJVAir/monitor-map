import { subDays, startOfDay, endOfDay, isToday } from "date-fns";
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
