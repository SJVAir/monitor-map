import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CalendarDate } from "@internationalized/date";
import type * as DateRangeModule from "$lib/data-chart/DateRange";

// Chart days are Pacific days whatever zone the device is in, so run these under another zone.
// Node re-reads TZ when it is assigned; the module is imported only after, and the zone is
// checked below so a runtime that ignores the change fails here instead of passing vacuously.
const previousTZ = process.env.TZ;
process.env.TZ = "America/New_York";

let createDateRange: typeof DateRangeModule.createDateRange;
let includesToday: typeof DateRangeModule.includesToday;
let extendToNow: typeof DateRangeModule.extendToNow;
let dateRangeLabel: typeof DateRangeModule.dateRangeLabel;
let fileDay: typeof DateRangeModule.fileDay;

beforeAll(async () => {
	({ createDateRange, includesToday, extendToNow, dateRangeLabel, fileDay } =
		await import("$lib/data-chart/DateRange"));
});

afterAll(() => {
	if (previousTZ === undefined) delete process.env.TZ;
	else process.env.TZ = previousTZ;
});

// Nov 4, 19:30 Pacific (PST, after the Nov 1 DST change); Nov 4, 22:30 in New York.
const now = new Date("2026-11-05T03:30:00Z");

describe("under a non-Pacific zone", () => {
	it("runs in New York time", () => {
		expect(now.getTimezoneOffset()).toBe(300);
	});
});

describe("createDateRange", () => {
	it("defaults to the start of yesterday, Pacific, through now", () => {
		expect(createDateRange(undefined, undefined, now)).toEqual({
			// Midnight Nov 3 PST.
			start: "2026-11-03T08:00:00.000Z",
			end: now.toISOString()
		});
	});

	it("spans whole Pacific days for a picked range", () => {
		const range = createDateRange(
			new CalendarDate(2026, 11, 1),
			new CalendarDate(2026, 11, 2),
			now
		);
		// Midnight Nov 1 is still PDT; the end of Nov 2 is PST.
		expect(range).toEqual({
			start: "2026-11-01T07:00:00.000Z",
			end: "2026-11-03T07:59:59.999Z"
		});
	});

	it("ends now when the picked end day is the Pacific today", () => {
		const range = createDateRange(
			new CalendarDate(2026, 11, 1),
			new CalendarDate(2026, 11, 4),
			now
		);
		expect(range.end).toBe(now.toISOString());
	});
});

describe("includesToday", () => {
	const start = "2026-11-01T07:00:00.000Z";

	it("is true for a range ending on the Pacific today", () => {
		// Nov 4, 18:00 PST.
		expect(includesToday({ start, end: "2026-11-05T02:00:00Z" }, now)).toBe(true);
	});

	it("is false for a range ending on an earlier Pacific day", () => {
		// Nov 3, 22:00 PST (Nov 4, 01:00 in New York).
		expect(includesToday({ start, end: "2026-11-04T06:00:00Z" }, now)).toBe(false);
	});

	it("is true for the default range", () => {
		expect(includesToday(createDateRange(undefined, undefined, now), now)).toBe(true);
	});
});

describe("extendToNow", () => {
	it("moves only the end, to the present", () => {
		const range = createDateRange(undefined, undefined, now);
		const later = new Date("2026-11-05T03:32:00Z");

		const extended = extendToNow(range, later);

		expect(extended).toEqual({ start: range.start, end: later.toISOString() });
		expect(range.end).toBe(now.toISOString());
	});

	it("carries a range across Pacific midnight", () => {
		const range = createDateRange(undefined, undefined, now);
		// Nov 5, 00:04 PST.
		const afterMidnight = new Date("2026-11-05T08:04:00Z");

		const extended = extendToNow(range, afterMidnight);

		expect(extended.start).toBe(range.start);
		expect(includesToday(extended, afterMidnight)).toBe(true);
	});
});

describe("labels", () => {
	it("names the range's Pacific days", () => {
		const range = createDateRange(
			new CalendarDate(2026, 11, 1),
			new CalendarDate(2026, 11, 2),
			now
		);
		// The end is 02:59 Nov 3 in New York.
		expect(dateRangeLabel(range)).toBe("Nov 1 – Nov 2, 2026");
		expect(fileDay(range.end)).toBe("02.Nov.2026");
	});
});
