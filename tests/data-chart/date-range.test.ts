import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDateRange, extendToNow, includesToday } from "$lib/data-chart/DateRange";

// Local-time constructors, so the specs hold in any timezone.
const NOW = new Date(2026, 9, 12, 15, 30);

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
});

afterEach(() => {
	vi.useRealTimers();
});

describe("includesToday", () => {
	it("is true for the default range", () => {
		expect(includesToday(createDateRange())).toBe(true);
	});

	it("is true for a range ending earlier today", () => {
		const range = {
			start: new Date(2026, 9, 1).toISOString(),
			end: new Date(2026, 9, 12, 0, 5).toISOString()
		};
		expect(includesToday(range)).toBe(true);
	});

	it("is false for a range ending yesterday", () => {
		const range = {
			start: new Date(2026, 9, 1).toISOString(),
			end: new Date(2026, 9, 11, 23, 59, 59).toISOString()
		};
		expect(includesToday(range)).toBe(false);
	});
});

describe("extendToNow", () => {
	it("moves only the end, to the present", () => {
		const range = createDateRange();
		vi.setSystemTime(new Date(2026, 9, 12, 15, 32));

		const extended = extendToNow(range);

		expect(extended.start).toBe(range.start);
		expect(extended.end).toBe(new Date(2026, 9, 12, 15, 32).toISOString());
		expect(range.end).toBe(NOW.toISOString());
	});

	it("carries a range across midnight", () => {
		const range = createDateRange();
		vi.setSystemTime(new Date(2026, 9, 13, 0, 4));

		const extended = extendToNow(range);

		expect(extended.start).toBe(range.start);
		expect(includesToday(extended)).toBe(true);
	});
});
