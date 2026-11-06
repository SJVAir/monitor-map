import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type * as PacificTimeModule from "$lib/data-chart/pacific-time";

// The chart shows Pacific times whatever zone the device is in, so run these under another
// zone (see date-range.test.ts for why TZ is set before the import and checked).
const previousTZ = process.env.TZ;
process.env.TZ = "America/New_York";

let chartRangeMax: typeof PacificTimeModule.chartRangeMax;
let formatPacificTime: typeof PacificTimeModule.formatPacificTime;

beforeAll(async () => {
	({ chartRangeMax, formatPacificTime } = await import("$lib/data-chart/pacific-time"));
});

afterAll(() => {
	if (previousTZ === undefined) delete process.env.TZ;
	else process.env.TZ = previousTZ;
});

const unix = (iso: string) => new Date(iso).getTime() / 1000;

// Nov 4, 22:30 Pacific (PST); already Nov 5, 01:30 in New York.
const now = new Date("2026-11-05T06:30:00Z");

describe("under a non-Pacific zone", () => {
	it("runs in New York time", () => {
		expect(now.getTimezoneOffset()).toBe(300);
	});
});

describe("chartRangeMax", () => {
	it("extends the x-axis to now when the data ends earlier the same Pacific day", () => {
		// Nov 4, 20:00 Pacific: the same Pacific day as now, though Nov 4 in New York and now
		// is Nov 5 there.
		expect(chartRangeMax(unix("2026-11-05T04:00:00Z"), now)).toBe(unix(now.toISOString()));
	});

	it("keeps the end of data from an earlier Pacific day", () => {
		// Nov 3, 23:00 Pacific; Nov 4, 02:00 in New York.
		const max = unix("2026-11-04T07:00:00Z");
		expect(chartRangeMax(max, now)).toBe(max);
	});

	it("keeps an end after now", () => {
		const max = unix("2026-11-05T07:00:00Z");
		expect(chartRangeMax(max, now)).toBe(max);
	});
});

describe("formatPacificTime", () => {
	it("formats an instant in Pacific time", () => {
		expect(formatPacificTime(unix("2026-11-05T04:05:00Z"))).toBe("Nov 4, 2026 8:05 PM");
	});

	it("follows daylight saving time", () => {
		// Jul 1, 00:00 UTC is Jun 30, 17:00 PDT.
		expect(formatPacificTime(unix("2026-07-01T00:00:00Z"))).toBe("Jun 30, 2026 5:00 PM");
	});
});
