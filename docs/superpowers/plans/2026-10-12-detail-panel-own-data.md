# Detail Panel Own Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The monitor detail panel loads its own monitor, so it shows any monitor whatever pollutant the map is coloring by, and the chart only refreshes on the timer when its date range is live.

**Architecture:** A panel-owned rune class (`MonitorDetailsState`) fetches the monitor with `getMonitorDetails(id)`. A pure function picks the pollutant to show. The chart takes the monitor, the pollutant and a refresh tick as props and stops reading the map's pollutant and levels from `monitorsManager`.

**Tech Stack:** Svelte 5 runes, TypeScript, `@sjvair/sdk`, uPlot, date-fns, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-12-detail-panel-own-data-design.md`

## Global Constraints

- Branch: `feat/detail-panel-own-data` (already created; the spec is committed on it).
- Tabs for indentation, double quotes, no trailing commas, print width 100. Run `npx prettier --write` on touched files before each commit.
- Import rune modules with their full extension from specs (`$lib/monitors/monitor-details.svelte.js`).
- No commit message carries AI attribution or a `Co-Authored-By` trailer.
- No release, no `npm publish`, no version bump.
- `monitorsManager`, `MonitorsMapIntegration`, `MonitorMapLayout`, the route tables and `LazyMonitorDetailPanel` must not change.
- The panel pollutants are exactly `"pm25"` and `"o3"`, in that order of preference when the map's pollutant is unavailable.
- Copy, verbatim: "Loading…", "Monitor not found.", "Couldn't load this monitor.", "This monitor has no current readings.", and "Showing {shown}. This monitor has no {map} readings." where both labels come from `meta.entryType(...).label` and the second is lowercased.
- Use the user's dev server if one is listening on port 5173; otherwise start a temporary one on 5199 and stop it afterwards.

## Review Focus

- A reading whose value is `"0.00"`: it is a real reading and the data box must show `0`, not be treated as missing. Pinned in Task 1.
- A reading whose value is empty or not a number: it is not a reading; the panel must fall back, not show `NaN`. Pinned in Task 1.
- Switching monitors while the previous request is still in flight: the slower response must not replace the newer monitor. Pinned in Task 3.
- A panel left open past midnight on the default range: a reasonable person expects the chart to keep following the present. The chart therefore remembers that its range was live when chosen (`live`), instead of re-testing the calendar day on every tick. Pinned in Task 2 (`extendToNow` across midnight) and checked in Task 5.
- A timed refresh arriving while a chart request is in flight: the older response must not overwrite the newer one, and a timed refresh must not blank the chart behind a spinner. Handled by the request counter and `silent` flag in Task 4, checked in the browser in Task 5.

---

### Task 1: Choosing the panel's pollutant

**Files:**
- Create: `src/lib/monitors/panel-pollutant.ts`
- Test: `tests/monitors/panel-pollutant.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces:
  - `type PanelPollutant = "pm25" | "o3"`
  - `interface PanelPollutantChoice { pollutant: PanelPollutant | null; hasReading: boolean }`
  - `readingPollutants(monitor: { latest: Record<string, { value?: string } | undefined> }): PanelPollutant[]`
  - `publishedPollutants(monitorType: string, meta: PanelMeta): PanelPollutant[]`
  - `choosePanelPollutant(mapPollutant: PanelPollutant | null, monitor: PanelMonitor, meta: PanelMeta): PanelPollutantChoice`
  - `interface PanelMeta { monitors: Record<string, { entries: Record<string, unknown> } | undefined> }` (satisfied by the SDK's `MonitorsMeta`)
  - `interface PanelMonitor { type: string; latest: Record<string, { value?: string } | undefined> }` (satisfied by the SDK's `MonitorDetails`)

- [ ] **Step 1: Write the failing test**

`tests/monitors/panel-pollutant.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
	choosePanelPollutant,
	publishedPollutants,
	readingPollutants
} from "$lib/monitors/panel-pollutant";

const reading = (value: string) => ({ value, timestamp: "2026-10-12T22:00:00Z" });

const META = {
	monitors: {
		purpleair: { entries: { pm25: { published: true }, pm10: { published: false } } },
		airnow: { entries: { o3: { published: true }, pm25: { published: true } } },
		vozbox: { entries: { o3: { published: true } } },
		// A type that carries pm25 but marks it unpublished.
		hidden: { entries: { pm25: { published: false } } },
		// Metadata without the flag at all: carrying the entry type counts.
		legacy: { entries: { o3: {} } }
	}
};

describe("readingPollutants", () => {
	it("lists the pollutants that have a numeric value, pm25 first", () => {
		expect(readingPollutants({ latest: { o3: reading("31"), pm25: reading("4.9") } })).toEqual([
			"pm25",
			"o3"
		]);
	});

	it("counts a zero reading", () => {
		expect(readingPollutants({ latest: { pm25: reading("0.00") } })).toEqual(["pm25"]);
	});

	it("ignores missing, empty and non-numeric values and other entry types", () => {
		expect(
			readingPollutants({
				latest: { pm25: reading(""), o3: reading("n/a"), temperature: reading("79.6") }
			})
		).toEqual([]);
		expect(readingPollutants({ latest: {} })).toEqual([]);
	});
});

describe("publishedPollutants", () => {
	it("lists the published pollutants of a monitor type, pm25 first", () => {
		expect(publishedPollutants("airnow", META)).toEqual(["pm25", "o3"]);
		expect(publishedPollutants("purpleair", META)).toEqual(["pm25"]);
	});

	it("leaves out an entry type marked unpublished", () => {
		expect(publishedPollutants("hidden", META)).toEqual([]);
	});

	it("counts an entry type whose metadata has no published flag", () => {
		expect(publishedPollutants("legacy", META)).toEqual(["o3"]);
	});

	it("returns nothing for an unknown monitor type", () => {
		expect(publishedPollutants("mystery", META)).toEqual([]);
	});
});

describe("choosePanelPollutant", () => {
	const purpleair = { type: "purpleair", latest: { pm25: reading("4.9") } };
	const airnow = { type: "airnow", latest: { pm25: reading("6.2"), o3: reading("31") } };

	it("uses the map's pollutant when the monitor has a reading for it", () => {
		expect(choosePanelPollutant("o3", airnow, META)).toEqual({ pollutant: "o3", hasReading: true });
		expect(choosePanelPollutant("pm25", airnow, META)).toEqual({
			pollutant: "pm25",
			hasReading: true
		});
	});

	it("falls back to the pollutant the monitor does have", () => {
		expect(choosePanelPollutant("o3", purpleair, META)).toEqual({
			pollutant: "pm25",
			hasReading: true
		});
	});

	it("uses the first available reading when the map has no pollutant yet", () => {
		expect(choosePanelPollutant(null, airnow, META)).toEqual({
			pollutant: "pm25",
			hasReading: true
		});
	});

	it("keeps the map's pollutant for a monitor with no reading whose type publishes it", () => {
		const inactive = { type: "airnow", latest: {} };
		expect(choosePanelPollutant("o3", inactive, META)).toEqual({
			pollutant: "o3",
			hasReading: false
		});
	});

	it("uses the published pollutant for a monitor with no reading of the map's kind", () => {
		const inactive = { type: "purpleair", latest: {} };
		expect(choosePanelPollutant("o3", inactive, META)).toEqual({
			pollutant: "pm25",
			hasReading: false
		});
	});

	it("has no pollutant when the monitor has no reading and its type publishes neither", () => {
		const inactive = { type: "hidden", latest: {} };
		expect(choosePanelPollutant("pm25", inactive, META)).toEqual({
			pollutant: null,
			hasReading: false
		});
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/monitors/panel-pollutant.test.ts`
Expected: FAIL, cannot resolve `$lib/monitors/panel-pollutant`.

- [ ] **Step 3: Write the implementation**

`src/lib/monitors/panel-pollutant.ts`:

```ts
/** The pollutants the detail panel can show, in order of preference. */
export const PANEL_POLLUTANTS = ["pm25", "o3"] as const;
export type PanelPollutant = (typeof PANEL_POLLUTANTS)[number];

/** The slice of the SDK's `MonitorDetails` this module reads. */
export interface PanelMonitor {
	type: string;
	latest: Record<string, { value?: string } | undefined>;
}

/** The slice of the SDK's `MonitorsMeta` this module reads. */
export interface PanelMeta {
	monitors: Record<string, { entries: Record<string, unknown> } | undefined>;
}

export interface PanelPollutantChoice {
	/** Null when the monitor has no reading and its type publishes neither pollutant. */
	pollutant: PanelPollutant | null;
	/** Whether the monitor has a current reading for `pollutant`. */
	hasReading: boolean;
}

/** The panel pollutants this monitor has a current, numeric reading for. */
export function readingPollutants(monitor: Pick<PanelMonitor, "latest">): PanelPollutant[] {
	return PANEL_POLLUTANTS.filter((pollutant) => {
		const value = monitor.latest[pollutant]?.value;
		return typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value));
	});
}

/**
 * The panel pollutants this monitor type publishes. The API marks each entry type with a
 * `published` flag the SDK does not type; a type that carries the entry without the flag
 * counts as publishing it.
 */
export function publishedPollutants(monitorType: string, meta: PanelMeta): PanelPollutant[] {
	const entries = meta.monitors[monitorType]?.entries ?? {};
	return PANEL_POLLUTANTS.filter((pollutant) => {
		const entry = entries[pollutant] as { published?: boolean } | undefined;
		return entry !== undefined && entry.published !== false;
	});
}

/**
 * The pollutant the detail panel shows: the map's when the monitor has it, otherwise the one
 * the monitor has. A monitor with no current reading still gets a pollutant when its type
 * publishes one, so its past data can be charted.
 */
export function choosePanelPollutant(
	mapPollutant: PanelPollutant | null,
	monitor: PanelMonitor,
	meta: PanelMeta
): PanelPollutantChoice {
	const withReading = readingPollutants(monitor);
	if (withReading.length > 0) {
		const pollutant =
			mapPollutant && withReading.includes(mapPollutant) ? mapPollutant : withReading[0];
		return { pollutant, hasReading: true };
	}

	const published = publishedPollutants(monitor.type, meta);
	if (published.length > 0) {
		const pollutant = mapPollutant && published.includes(mapPollutant) ? mapPollutant : published[0];
		return { pollutant, hasReading: false };
	}

	return { pollutant: null, hasReading: false };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/monitors/panel-pollutant.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/lib/monitors/panel-pollutant.ts tests/monitors/panel-pollutant.test.ts
npx eslint src/lib/monitors/panel-pollutant.ts tests/monitors/panel-pollutant.test.ts
git add src/lib/monitors/panel-pollutant.ts tests/monitors/panel-pollutant.test.ts
git commit -m "feat: choose the detail panel's pollutant from the monitor's own readings"
```

---

### Task 2: Date range helpers

**Files:**
- Modify: `src/lib/data-chart/DateRange.ts`
- Test: `tests/data-chart/date-range.test.ts` (new folder)

**Interfaces:**
- Consumes: the existing `DateRange` type (`{ start: string; end: string }`, ISO strings) and `createDateRange`.
- Produces:
  - `includesToday(range: DateRange): boolean`
  - `extendToNow(range: DateRange): DateRange`

- [ ] **Step 1: Write the failing test**

`tests/data-chart/date-range.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/data-chart/date-range.test.ts`
Expected: FAIL, `extendToNow` and `includesToday` are not exported.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/data-chart/DateRange.ts`, and add `parseISO` to its date-fns import (`import { subDays, startOfDay, endOfDay, isToday, parseISO } from "date-fns";`):

```ts
/** Whether the range ends on the current calendar day, i.e. it can still gain entries. */
export function includesToday(range: DateRange): boolean {
	return isToday(parseISO(range.end));
}

/** The same range with its end moved to the present. */
export function extendToNow(range: DateRange): DateRange {
	return { start: range.start, end: new Date().toISOString() };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/data-chart/date-range.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/lib/data-chart/DateRange.ts tests/data-chart/date-range.test.ts
npx eslint src/lib/data-chart/DateRange.ts tests/data-chart/date-range.test.ts
git add src/lib/data-chart/DateRange.ts tests/data-chart/date-range.test.ts
git commit -m "feat: date range helpers for a chart that follows the present"
```

---

### Task 3: `MonitorDetailsState`

**Files:**
- Create: `src/lib/monitors/monitor-details.svelte.ts`
- Test: `tests/monitors/monitor-details.test.ts`

**Interfaces:**
- Consumes: `getMonitorDetails(id: string): Promise<MonitorDetails>` and the `MonitorDetails` type from `@sjvair/sdk`. A failed request rejects with an `Error` whose `cause` is `{ url, init, result }`, where `result.status` is the HTTP status.
- Produces:
  - `type MonitorDetailsStatus = "loading" | "ready" | "not-found" | "failed"`
  - `class MonitorDetailsState` with `monitor: MonitorDetails | null`, `status: MonitorDetailsStatus`, `load(id: string): Promise<void>`, `refresh(): Promise<void>`, `retry(): Promise<void>`

- [ ] **Step 1: Write the failing test**

`tests/monitors/monitor-details.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MonitorDetailsState } from "$lib/monitors/monitor-details.svelte.js";

const sdk = vi.hoisted(() => ({ getMonitorDetails: vi.fn() }));
vi.mock("@sjvair/sdk", () => sdk);

const monitor = (id: string, value = "4.9") => ({ id, type: "purpleair", latest: { pm25: { value } } });

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

// The shape the SDK's httpRequest rejects with.
const httpError = (status: number) =>
	new Error("Request failed", { cause: { result: { status } } });

let details: MonitorDetailsState;
let logged: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	sdk.getMonitorDetails.mockReset();
	details = new MonitorDetailsState();
	logged = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	logged.mockRestore();
});

describe("MonitorDetailsState", () => {
	it("starts out loading with no monitor", () => {
		expect(details.status).toBe("loading");
		expect(details.monitor).toBeNull();
	});

	it("loads a monitor", async () => {
		sdk.getMonitorDetails.mockResolvedValue(monitor("a"));

		await details.load("a");

		expect(sdk.getMonitorDetails).toHaveBeenCalledWith("a");
		expect(details.status).toBe("ready");
		expect(details.monitor).toEqual(monitor("a"));
	});

	it("clears the previous monitor while the next one loads", async () => {
		sdk.getMonitorDetails.mockResolvedValueOnce(monitor("a"));
		await details.load("a");
		const next = deferred<ReturnType<typeof monitor>>();
		sdk.getMonitorDetails.mockReturnValueOnce(next.promise);

		const loading = details.load("b");

		expect(details.status).toBe("loading");
		expect(details.monitor).toBeNull();
		next.resolve(monitor("b"));
		await loading;
		expect(details.monitor).toEqual(monitor("b"));
	});

	it("reports an unknown id as not found, without logging", async () => {
		sdk.getMonitorDetails.mockRejectedValue(httpError(404));

		await details.load("nope");

		expect(details.status).toBe("not-found");
		expect(details.monitor).toBeNull();
		expect(logged).not.toHaveBeenCalled();
	});

	it("reports any other failure as failed, and loads on retry", async () => {
		sdk.getMonitorDetails.mockRejectedValueOnce(httpError(500));

		await details.load("a");

		expect(details.status).toBe("failed");
		expect(logged).toHaveBeenCalledTimes(1);

		sdk.getMonitorDetails.mockResolvedValueOnce(monitor("a"));
		await details.retry();

		expect(details.status).toBe("ready");
		expect(details.monitor).toEqual(monitor("a"));
	});

	it("treats a rejection with no status as failed", async () => {
		sdk.getMonitorDetails.mockRejectedValue(new TypeError("Failed to fetch"));

		await details.load("a");

		expect(details.status).toBe("failed");
	});

	it("drops a slow response for a monitor that is no longer the current one", async () => {
		const slow = deferred<ReturnType<typeof monitor>>();
		sdk.getMonitorDetails.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(monitor("b"));

		const first = details.load("a");
		await details.load("b");
		slow.resolve(monitor("a"));
		await first;

		expect(details.monitor).toEqual(monitor("b"));
		expect(details.status).toBe("ready");
	});

	it("drops a slow failure for a monitor that is no longer the current one", async () => {
		const slow = deferred<ReturnType<typeof monitor>>();
		sdk.getMonitorDetails.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(monitor("b"));

		const first = details.load("a");
		await details.load("b");
		slow.reject(httpError(500));
		await first;

		expect(details.status).toBe("ready");
		expect(details.monitor).toEqual(monitor("b"));
	});

	it("refreshes the current monitor without leaving the ready state", async () => {
		sdk.getMonitorDetails.mockResolvedValueOnce(monitor("a", "4.9"));
		await details.load("a");
		const next = deferred<ReturnType<typeof monitor>>();
		sdk.getMonitorDetails.mockReturnValueOnce(next.promise);

		const refreshing = details.refresh();

		expect(details.status).toBe("ready");
		expect(details.monitor).toEqual(monitor("a", "4.9"));
		next.resolve(monitor("a", "5.3"));
		await refreshing;
		expect(details.monitor).toEqual(monitor("a", "5.3"));
	});

	it("keeps the data it has when a refresh fails", async () => {
		sdk.getMonitorDetails.mockResolvedValueOnce(monitor("a"));
		await details.load("a");
		sdk.getMonitorDetails.mockRejectedValueOnce(httpError(500));

		await details.refresh();

		expect(details.status).toBe("ready");
		expect(details.monitor).toEqual(monitor("a"));
		expect(logged).toHaveBeenCalledTimes(1);
	});

	it("does not refresh before a monitor has loaded", async () => {
		await details.refresh();
		expect(sdk.getMonitorDetails).not.toHaveBeenCalled();

		sdk.getMonitorDetails.mockRejectedValueOnce(httpError(404));
		await details.load("nope");
		sdk.getMonitorDetails.mockClear();
		await details.refresh();

		expect(sdk.getMonitorDetails).not.toHaveBeenCalled();
	});

	it("drops a refresh that finishes after another monitor was opened", async () => {
		sdk.getMonitorDetails.mockResolvedValueOnce(monitor("a"));
		await details.load("a");
		const slow = deferred<ReturnType<typeof monitor>>();
		sdk.getMonitorDetails.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(monitor("b"));

		const refreshing = details.refresh();
		await details.load("b");
		slow.resolve(monitor("a", "9.9"));
		await refreshing;

		expect(details.monitor).toEqual(monitor("b"));
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/monitors/monitor-details.test.ts`
Expected: FAIL, cannot resolve `$lib/monitors/monitor-details.svelte.js`.

- [ ] **Step 3: Write the implementation**

`src/lib/monitors/monitor-details.svelte.ts`:

```ts
import { getMonitorDetails, type MonitorDetails } from "@sjvair/sdk";

export type MonitorDetailsStatus = "loading" | "ready" | "not-found" | "failed";

/**
 * One monitor, fetched by id. Unlike `monitorsManager.latest`, this does not depend on the
 * map's pollutant or on the monitor being active, so the detail panel can show any monitor.
 */
export class MonitorDetailsState {
	monitor: MonitorDetails | null = $state.raw(null);
	status: MonitorDetailsStatus = $state("loading");

	#id: string | null = null;
	// Bumped per request; a response for anything but the latest request is dropped.
	#request = 0;

	async load(id: string): Promise<void> {
		this.#id = id;
		const request = ++this.#request;
		this.monitor = null;
		this.status = "loading";

		try {
			const monitor = await getMonitorDetails(id);
			if (request !== this.#request) return;
			this.monitor = monitor;
			this.status = "ready";
		} catch (error) {
			if (request !== this.#request) return;
			if (isNotFound(error)) {
				this.status = "not-found";
				return;
			}
			console.error(error);
			this.status = "failed";
		}
	}

	/** Re-fetches the monitor already shown. A failure keeps the data on screen. */
	async refresh(): Promise<void> {
		if (this.status !== "ready" || this.#id === null) return;
		const request = ++this.#request;

		try {
			const monitor = await getMonitorDetails(this.#id);
			if (request !== this.#request) return;
			this.monitor = monitor;
		} catch (error) {
			if (request === this.#request) console.error(error);
		}
	}

	retry(): Promise<void> {
		return this.#id === null ? Promise.resolve() : this.load(this.#id);
	}
}

/** The SDK rejects a failed request with `cause.result.status` set to the HTTP status. */
function isNotFound(error: unknown): boolean {
	const cause = (error as { cause?: { result?: { status?: unknown } } } | null)?.cause;
	return cause?.result?.status === 404;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/monitors/monitor-details.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Confirm the SDK import type-checks**

Run: `npm run check`
Expected: `0 ERRORS` (3 existing warnings in `MapShell.svelte`). If `getMonitorDetails` or `MonitorDetails` is not exported from `@sjvair/sdk`'s root, import both from `@sjvair/sdk/monitors` here and mock that specifier in the spec.

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/lib/monitors/monitor-details.svelte.ts tests/monitors/monitor-details.test.ts
npx eslint src/lib/monitors/monitor-details.svelte.ts tests/monitors/monitor-details.test.ts
git add src/lib/monitors/monitor-details.svelte.ts tests/monitors/monitor-details.test.ts
git commit -m "feat: MonitorDetailsState loads one monitor by id"
```

---

### Task 4: The chart takes its pollutant as a prop

After this task the chart no longer reads `monitorsManager.pollutant` or `monitorsManager.levels`. The panel keeps working: it passes the map's pollutant until Task 5 changes what it passes.

**Files:**
- Create: `src/lib/data-chart/level-colors.ts`
- Modify: `src/lib/data-chart/tooltip.ts`, `src/lib/data-chart/chart-utils.ts`, `src/lib/data-chart/requests.ts`, `src/lib/data-chart/DataChart.svelte`, `src/lib/MonitorDetailPanel.svelte` (the `<DataChart>` call only)
- Test: `tests/data-chart/level-colors.test.ts`

**Interfaces:**
- Consumes: `includesToday`, `extendToNow` from Task 2; `PanelPollutant` from Task 1.
- Produces:
  - `type LevelColors = Array<[number, string]>`
  - `levelColors(levels: ReadonlyArray<{ range: readonly number[]; color: string }>): LevelColors`
  - `uPlotCursorConfig.get(colors: LevelColors): uPlot.Cursor`
  - `getChartConfig(sourceName: MonitorType, maxDiff: number, width: number, height: number, colors: LevelColors, label: string): uPlot.Options`
  - `fetchChartData(m: ChartMonitor, d: DateRange, entryType: PanelPollutant): Promise<uPlot.AlignedData>`
  - `type ChartMonitor = Pick<MonitorDetails, "id" | "name" | "type" | "data_source">`
  - `DataChart` props: `{ monitor: ChartMonitor; pollutant: PanelPollutant; refreshTick?: number }`

- [ ] **Step 1: Write the failing test**

`tests/data-chart/level-colors.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { levelColors } from "$lib/data-chart/level-colors";

describe("levelColors", () => {
	it("maps each level to its lower bound and its color without the leading #", () => {
		const levels = [
			{ range: [0, 9], color: "#00e400" },
			{ range: [9.1, 35.4], color: "#ffff00" }
		];

		expect(levelColors(levels)).toEqual([
			[0, "00e400"],
			[9.1, "ffff00"]
		]);
	});

	it("accepts a color that has no leading #", () => {
		expect(levelColors([{ range: [0, 1], color: "abcdef" }])).toEqual([[0, "abcdef"]]);
	});

	it("returns nothing for no levels", () => {
		expect(levelColors([])).toEqual([]);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/data-chart/level-colors.test.ts`
Expected: FAIL, cannot resolve `$lib/data-chart/level-colors`.

- [ ] **Step 3: Create `level-colors.ts`**

`src/lib/data-chart/level-colors.ts`:

```ts
/** Color stops for a chart: each level's lower bound and its hex color without the `#`. */
export type LevelColors = Array<[number, string]>;

export function levelColors(
	levels: ReadonlyArray<{ range: readonly number[]; color: string }>
): LevelColors {
	return levels.map((level) => [level.range[0], level.color.replace(/^#/, "")]);
}
```

Run: `npx vitest run tests/data-chart/level-colors.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 4: Make `tooltip.ts` take the colors**

In `src/lib/data-chart/tooltip.ts`:

Replace the top of the file

```ts
import { format, fromUnixTime } from "date-fns";
import { monitorsManager } from "../monitors/monitors.svelte";

function getColors(): Array<[number, string]> {
	return (monitorsManager.levels ?? []).map((level) => [
		level.range[0],
		level.color.replace(/^#/, "")
	]) as Array<[number, string]>;
}
```

with

```ts
import { format, fromUnixTime } from "date-fns";
import type { LevelColors } from "./level-colors";
```

Change `get: (): uPlot.Cursor => ({` to `get: (colors: LevelColors): uPlot.Cursor => ({`, and delete the line `const colors = getColors();` inside its `fill` function. Nothing else in the file uses `getColors` or `monitorsManager`.

- [ ] **Step 5: Make `chart-utils.ts` take the colors and the label**

In `src/lib/data-chart/chart-utils.ts`:

Replace

```ts
import { monitorsManager } from "../monitors/monitors.svelte";
import { tooltipsPlugin, uPlotCursorConfig } from "./tooltip";
```

with

```ts
import type { LevelColors } from "./level-colors";
import { tooltipsPlugin, uPlotCursorConfig } from "./tooltip";
```

Delete the `getColors()` function. Replace the `pm25SeriesConfig` and `pm25Avg60SeriesConfig` constants with functions of the stops:

```ts
/** The level stops plus a final black stop, so values above the top level still get a color. */
function gradientStops(colors: LevelColors): LevelColors {
	return [...colors, [Infinity, "000000"]];
}

const pm25SeriesConfig = (stops: LevelColors) => ({
	...baseYSeriesConfig,
	label: "Real Time",
	width: 2,
	stroke: (u: uPlot) => scaleGradient(u, "y", 1, stops, true)
});

const pm25Avg60SeriesConfig = (stops: LevelColors) => ({
	...baseYSeriesConfig,
	label: "60 Minute Average",
	stroke: (u: uPlot) => autograd(u, PM25_AVG_60_STROKE, stops)
});
```

Change the signature and the three uses inside `getChartConfig`:

```ts
export function getChartConfig(
	sourceName: MonitorType,
	maxDiff: number,
	width: number,
	height: number,
	colors: LevelColors,
	label: string
): uPlot.Options {
	const series: Array<uPlot.Series> = getSeriesConfigs(sourceName, gradientStops(colors));
```

`cursor: uPlotCursorConfig.get(),` becomes `cursor: uPlotCursorConfig.get(colors),` and the y axis `label: monitorsManager.pollutant === "pm25" ? "PM 2.5" : "Ozone",` becomes `label,`.

Replace `getSeriesConfigs` and `autograd`:

```ts
function getSeriesConfigs(monitorType: MonitorType, stops: LevelColors) {
	const singleSeriesConfig = { ...pm25Avg60SeriesConfig(stops), width: 2 };

	switch (monitorType) {
		case "airnow":
		case "aqview":
		case "bam1022":
		case "vozbox":
		case "aqlite":
			return [baseXSeriesConfig, singleSeriesConfig];

		case "airgradient":
		case "purpleair":
			return [baseXSeriesConfig, pm25SeriesConfig(stops)];
	}
}

function autograd(u: uPlot, fallback: string, stops: LevelColors) {
	if (u.series.length > 2) {
		return fallback;
	}
	return scaleGradient(u, "y", 1, stops, true);
}
```

`scaleGradient` is unchanged.

- [ ] **Step 6: Make `requests.ts` take the entry type**

In `src/lib/data-chart/requests.ts`, replace the imports and the head of `fetchChartData`:

```ts
import { getMonitorEntries, type MonitorDetails, type MonitorEntry } from "@sjvair/sdk";
import { getUnixTime, parseISO, differenceInMinutes, addMinutes } from "date-fns";
import type { PanelPollutant } from "../monitors/panel-pollutant";
import type { DateRange } from "./DateRange";

/** The monitor fields the chart reads. */
export type ChartMonitor = Pick<MonitorDetails, "id" | "name" | "type" | "data_source">;

export async function fetchChartData(
	m: ChartMonitor,
	d: DateRange,
	entryType: PanelPollutant
): Promise<uPlot.AlignedData> {
	return await getMonitorEntries({
		entryType,
		monitorId: m.id,
		timestampGte: d.start,
		timestampLte: d.end
	})
```

The rest of the function and `fillChartDataRecords` are unchanged. The `monitorsManager` import is gone.

- [ ] **Step 7: Update `DataChart.svelte`**

In the `<script>` of `src/lib/data-chart/DataChart.svelte`:

Replace the imports from `import type { MonitorLatestType } from "@sjvair/sdk";` through `import { monitorsManager } from "../monitors/monitors.svelte";` so that the block reads:

```ts
	import { untrack } from "svelte";
	import type { Attachment } from "svelte/attachments";
	import type { DateRange as CalendarRange } from "bits-ui";
	import { parseAbsolute } from "@internationalized/date";
	import { Maximize, SquareX } from "@lucide/svelte";
	import uPlot from "uplot";
	import "uplot/dist/uPlot.min.css";
	import { getMonitorEntriesCSVUrl } from "@sjvair/sdk/monitors";
	import { format, parseISO } from "date-fns";
	import { RangeCalendar } from "$lib/components/ui/range-calendar";
	import type { PanelPollutant } from "../monitors/panel-pollutant";
	import { monitorsManager } from "../monitors/monitors.svelte";
	import { DataChartManager } from "./data-chart.svelte";
	import { createDateRange, extendToNow, includesToday } from "./DateRange";
	import { fetchChartData, type ChartMonitor } from "./requests";
	import { getChartConfig } from "./chart-utils";
	import { levelColors } from "./level-colors";

	interface Props {
		monitor: ChartMonitor;
		/** The pollutant to chart. Independent of the pollutant the map is coloring by. */
		pollutant: PanelPollutant;
		/** Bumped by the owner whenever fresh data may exist; see the effect below. */
		refreshTick?: number;
	}

	let { monitor, pollutant, refreshTick = 0 }: Props = $props();
```

Replace `const pollutantLabel = $derived(monitorsManager.pollutant === "pm25" ? "PM 2.5" : "Ozone");` with:

```ts
	const pollutantLabel = $derived(pollutant === "pm25" ? "PM 2.5" : "Ozone");
	// Level definitions are shared metadata, not the map's current selection.
	const colors = $derived(
		levelColors(monitorsManager.meta?.entryType(pollutant).asIter.levels ?? [])
	);
```

Replace

```ts
	$effect(() => {
		if (monitor) loadChartData();
	});
```

with

```ts
	// Reload for another monitor or pollutant, not for a new object describing the same one.
	$effect(() => {
		void monitor.id;
		void pollutant;
		untrack(() => loadChartData());
	});

	// Whether the chosen range ended on the day it was chosen, so it should follow the present.
	// Remembered, not re-tested per tick: a panel left open past midnight keeps following.
	let live = includesToday(chartManager.dateRange);
	let seenTick = untrack(() => refreshTick);

	// A range that ended in the past cannot gain entries, so only a live one reloads.
	$effect(() => {
		const tick = refreshTick;
		if (tick === seenTick) return;
		seenTick = tick;
		if (!live) return;
		untrack(() => {
			chartManager.dateRange = extendToNow(chartManager.dateRange);
			loadChartData({ silent: true });
		});
	});
```

In `rebuild`, change `const opts = getChartConfig(monitor.type, maxDiff, width, height);` to:

```ts
			const opts = getChartConfig(monitor.type, maxDiff, width, height, colors, pollutantLabel);
```

Replace `loadChartData` with:

```ts
	let chartRequest = 0;

	// `silent` keeps the current chart on screen while a timed refresh loads.
	async function loadChartData({ silent = false } = {}) {
		const request = ++chartRequest;
		if (!silent) chartManager.loading = true;
		const data = await fetchChartData(monitor, chartManager.dateRange, pollutant);
		// A newer request (another range, monitor, pollutant or refresh) owns the chart now.
		if (request !== chartRequest) return;
		chartManager.chartData = data;
		chartManager.loading = false;
	}
```

In `onUpdate`, add `live = includesToday(chartManager.dateRange);` on the line after `chartManager.dateRange = createDateRange(dataRange.start, dataRange.end);`.

In `downloadCSV`, change `entryType: monitorsManager.pollutant ?? "pm25",` to `entryType: pollutant,`.

The markup and `<style>` are unchanged.

- [ ] **Step 8: Pass the pollutant from the panel**

In `src/lib/MonitorDetailPanel.svelte`, change `<DataChart {monitor} />` to:

```svelte
				<DataChart {monitor} pollutant={monitorsManager.pollutant ?? "pm25"} />
```

This keeps today's behavior until Task 5 replaces the panel's data source.

- [ ] **Step 9: Verify**

Run: `npm run check`
Expected: `0 ERRORS`.

Run: `npm test`
Expected: all specs pass.

Run: `grep -rn "monitorsManager" src/lib/data-chart/`
Expected: exactly two lines, both in `DataChart.svelte` (the import and the `meta` read).

- [ ] **Step 10: Commit**

```bash
npx prettier --write src/lib/data-chart src/lib/MonitorDetailPanel.svelte tests/data-chart
npx eslint src/lib/data-chart src/lib/MonitorDetailPanel.svelte tests/data-chart
git add src/lib/data-chart src/lib/MonitorDetailPanel.svelte tests/data-chart/level-colors.test.ts
git commit -m "refactor: the data chart takes its pollutant and refresh signal as props"
```

---

### Task 5: The panel loads its own monitor

**Files:**
- Modify: `src/lib/MonitorDetailPanel.svelte`, `CLAUDE.md`

**Interfaces:**
- Consumes: `MonitorDetailsState` (Task 3); `choosePanelPollutant`, `PanelPollutant` (Task 1); `DataChart` props `{ monitor, pollutant, refreshTick }` (Task 4); the existing `LoadError` component (`{ message: string; onretry: () => void }`).
- Produces: nothing other tasks use.

- [ ] **Step 1: Replace the panel's `<script>`**

Replace everything from `<script lang="ts">` through `</script>` in `src/lib/MonitorDetailPanel.svelte` with:

```svelte
<script lang="ts">
	import { untrack, type ComponentProps } from "svelte";
	import type { SJVAirEntryLevel } from "@sjvair/sdk";
	import DataBox from "$lib/components/DataBox.svelte";
	import LoadError from "$lib/LoadError.svelte";
	import MonitorWidgetModal from "$lib/monitors/components/MonitorWidgetModal.svelte";
	import MonitorSubscriptionManager from "$lib/monitors/components/MonitorSubscriptionManager.svelte";
	import DataChart from "$lib/data-chart/DataChart.svelte";
	import { monitorsManager } from "$lib";
	import { MonitorDetailsState } from "$lib/monitors/monitor-details.svelte";
	import { choosePanelPollutant } from "$lib/monitors/panel-pollutant";
	import { useMonitorMapRouter } from "./router-context";
	import { fetchTempByCoords } from "$lib/weather";
	import { Colors, valueToColor } from "$lib/colors";
	import { getCurrentLevel } from "$lib/monitors/monitor-utils";

	type TempDataBox = Pick<ComponentProps<typeof DataBox>, "color" | "value">;

	interface BadgeOpts {
		bgClass?: string;
		iconColorClass?: string;
		labelColorClass?: string;
		href?: string;
	}
	const { route, navigate, basePath } = useMonitorMapRouter();

	// The panel fetches its own monitor: the map's readings only hold monitors that have a
	// current reading for the map's pollutant.
	const details = new MonitorDetailsState();
	const meta = $derived(monitorsManager.meta);
	// Shown only once the metadata is in too; labels and levels come from it.
	const monitor = $derived(details.status === "ready" && meta ? details.monitor : null);

	$effect(() => {
		const id = route.params.id;
		if (id) untrack(() => details.load(id));
	});

	// Bumped whenever the map's readings are replaced, i.e. its 2-minute refresh ran. The data
	// box follows it; the chart decides for itself whether its date range can have new entries.
	let refreshTick = $state(0);
	let seenLatest = untrack(() => monitorsManager.latest);

	$effect(() => {
		const latest = monitorsManager.latest;
		// Null while a pollutant change is loading; wait for the readings that follow.
		if (!latest || latest === seenLatest) return;
		// The first readings of a cold load arrive alongside this panel's own request.
		const first = seenLatest === null;
		seenLatest = latest;
		if (first) return;
		untrack(() => {
			details.refresh();
			refreshTick++;
		});
	});

	const panel = $derived(
		monitor && meta ? choosePanelPollutant(monitorsManager.pollutant, monitor, meta) : null
	);
	const reading = $derived(
		monitor && panel?.pollutant && panel.hasReading ? monitor.latest[panel.pollutant] : undefined
	);
	// Set when the panel shows a different pollutant than the map is coloring by.
	const pollutantNote = $derived.by(() => {
		const mapPollutant = monitorsManager.pollutant;
		if (!meta || !panel?.pollutant || !panel.hasReading || !mapPollutant) return;
		if (panel.pollutant === mapPollutant) return;
		const shown = meta.entryType(panel.pollutant).label;
		const missing = meta.entryType(mapPollutant).label.toLowerCase();
		return `Showing ${shown}. This monitor has no ${missing} readings.`;
	});

	let tempData: TempDataBox | undefined = $state();
	const entryData: ComponentProps<typeof DataBox> | undefined = $derived.by(() => {
		if (!monitor || !meta || !panel?.pollutant || !reading) return;

		const entryType = meta.entryType(panel.pollutant);
		const level: SJVAirEntryLevel | undefined = getCurrentLevel(
			reading.value,
			entryType.asIter.levels!
		);

		const updateDuration = meta.monitorType(monitor.type).expected_interval;

		return {
			color: level?.color ?? "",
			header: entryType.label,
			subheading: `(${updateDuration} avg)`,
			value: Math.round(parseInt(reading.value, 10)).toString()
		};
	});

	const tempColors = [
		{ min: -Infinity, color: Colors.blue },
		{ min: 65, color: Colors.green },
		{ min: 78, color: Colors.yellow },
		{ min: 95, color: Colors.red }
	];

	$effect(() => {
		if (monitor && monitor.position) {
			fetchTempByCoords(monitor.position.coordinates).then((temperature) => {
				tempData = {
					value: `${temperature}°F`,
					color: valueToColor(temperature, tempColors)
				};
			});
		}
	});
</script>
```

The data box's value expression and the temperature effect are carried over unchanged, apart
from reading `reading.value` in place of `monitor.latest.value`.

- [ ] **Step 2: Replace the panel's markup**

Leave the `{#snippet badge(...)}` block as it is. Replace everything from `<div class="tall:overflow-y-hidden flex h-full w-full flex-col overflow-y-auto bg-white">` to the end of the file with:

```svelte
<div class="tall:overflow-y-hidden flex h-full w-full flex-col overflow-y-auto bg-white">
	<div
		class="flex flex-col items-center justify-center gap-8 border-b border-gray-200 p-4 shadow-lg"
	>
		<button
			class="cursor-pointer self-end rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50"
			onclick={() => navigate(`${basePath}/`)}
		>
			✕ Close
		</button>
		{#if monitor}
			<h2 class="text-center text-3xl font-semibold">{monitor.name}</h2>
			<div class="flex flex-wrap items-center justify-center gap-4">
				{#if monitor.is_sjvair}
					{@render badge("lungs", "SJVAir", {
						bgClass: "bg-aqua-haze",
						iconColorClass: "bg-sky-600",
						labelColorClass: "text-sky-600"
					})}
				{/if}

				{@render badge("rss-feed", monitor.data_source.name, { href: monitor.data_source.url })}
				{@render badge("router", monitor.device)}
				{@render badge("location-on", monitor.county)}
				{@render badge("location-searching", monitor.location)}
			</div>
			{#if pollutantNote}
				<p class="text-center text-sm text-gray-600">{pollutantNote}</p>
			{:else if panel && !panel.hasReading}
				<p class="text-center text-sm text-gray-600">This monitor has no current readings.</p>
			{/if}
		{/if}
	</div>

	<div class="tall:overflow-y-auto flex flex-col items-center gap-12 p-5 pt-10">
		{#if details.status === "not-found"}
			<p class="text-gray-700" role="alert">Monitor not found.</p>
		{:else if details.status === "failed"}
			<LoadError message="Couldn't load this monitor." onretry={() => details.retry()} />
		{:else if !monitor || !panel}
			<p class="text-sm text-gray-500">Loading…</p>
		{:else}
			{#if tempData || entryData}
				<div class="flex w-full justify-around">
					{#if tempData}
						<DataBox color={tempData.color} header="Temperature" value={tempData.value} />
					{/if}
					{#if entryData}
						<DataBox
							color={entryData.color}
							header={entryData.header}
							subheading={entryData.subheading}
							value={entryData.value}
						/>
					{/if}
				</div>
			{/if}

			<div class="tall:block hidden">
				<MonitorWidgetModal monitorId={monitor.id} />
			</div>
			<!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
			{#if (globalThis as any).USER?.is_authenticated}
				<MonitorSubscriptionManager monitorId={monitor.id} />
			{/if}

			{#if panel.pollutant}
				<div class="w-full">
					<DataChart {monitor} pollutant={panel.pollutant} {refreshTick} />
				</div>
			{/if}

			<div class="w-full">
				<h3 class="font-semibold">Data Provided Courtesy Of:</h3>
				<ul>
					{#each monitor.data_providers as provider, idx (idx)}
						<li>
							{#if provider.url}
								<a class="text-link" href={provider.url} target="_blank">{provider.name}</a>
							{:else}
								<span>{provider.name}</span>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</div>
```

- [ ] **Step 3: Type-check, lint and test**

Run: `npm run check`
Expected: `0 ERRORS`.

If `choosePanelPollutant(monitorsManager.pollutant, monitor, meta)` does not type-check because the SDK's `MonitorDetails["latest"]` or `MonitorsMeta` is narrower than `PanelMonitor`/`PanelMeta`, widen the two interfaces in `src/lib/monitors/panel-pollutant.ts` to accept them (for example `latest: Partial<Record<string, { value?: string }>>`). Do not cast at the call site. Re-run `npx vitest run tests/monitors/panel-pollutant.test.ts` after any change there.

Run: `npm run lint && npm test && npm run test:bundle`
Expected: lint clean, all specs pass, "Bundle check passed."

- [ ] **Step 4: Check the panel in a browser**

Find a dev server: `ss -ltn | grep -E ':(5173|5199)\b'`. If none, run `npm run dev -- --port 5199 --strictPort` in the background and stop it when done. The dev app talks to the API on `http://localhost:8000`.

Pick the monitors to test with:

```bash
python3 - <<'EOF'
import json, urllib.request
B = "http://localhost:8000/api/2.0/monitors"
get = lambda u: json.load(urllib.request.urlopen(u, timeout=20))["data"]
o3 = {m["id"] for m in get(f"{B}/o3/current/")}
pm = {m["id"]: m for m in get(f"{B}/pm25/current/")}
print("pm25 only:", next(i for i, m in pm.items() if i not in o3 and m["type"] == "purpleair"))
print("both:     ", next((i for i in pm if i in o3), "none in this data set"))
print("inactive: ", next(m["id"] for m in get(f"{B}/") if not m["is_active"]))
EOF
```

Open each URL and confirm:

| URL | Expected |
| --- | --- |
| `/monitor/<pm25 only>?pollutant=o3` | Name, badges, "Showing PM2.5. This monitor has no ozone readings.", a PM2.5 data box, a chart titled "PM 2.5 Readings" |
| `/monitor/<both>?pollutant=o3` | An Ozone data box and "Ozone Readings", no note. Switch the Pollutant menu to PM2.5: the box and chart change to PM2.5 without the panel closing or blanking |
| `/monitor/<inactive>` | Name, badges, "This monitor has no current readings.", no data box, a chart area |
| `/monitor/Ii74A9HpRga11z0uzuAh4X` | "Monitor not found." |
| `/monitor/<pm25 only>?pollutant=pm25` | No note; the box value is the integer part of `latest.pm25.value` from `/api/2.0/monitors/<id>/` |

Then confirm the refresh rule without waiting 2 minutes. In the page's console, with a panel open on the default date range:

```js
const { monitorsManager } = await import("/src/lib/monitors/monitors.svelte.ts");
const seen = [];
const realFetch = window.fetch;
window.fetch = (input, init) => {
	const url = String(input instanceof Request ? input.url : input);
	if (/\/monitors\/[^/]+\/(entries\/|$|\?)/.test(url)) seen.push(url.replace(/^.*\/api\/2\.0/, ""));
	return realFetch(input, init);
};
await monitorsManager.update();
await new Promise((r) => setTimeout(r, 1500));
seen;
```

Expected with the default range: one `/monitors/<id>/` request and one `/monitors/<id>/entries/<pollutant>/` request, and the chart stays visible (no spinner) while it loads.

Pick a range that ends before today in the calendar, clear `seen` (`seen.length = 0`), run `await monitorsManager.update()` again and wait.
Expected: only the `/monitors/<id>/` request. No `entries` request.

(If the dev server has hot-reloaded files since it started, that `import()` returns a second copy of the manager and nothing happens. Restart the dev server and reload the page first.)

- [ ] **Step 5: Update `CLAUDE.md`**

In the "Monitor Data Flow" section, after the numbered list item 4, add:

```markdown
5. **`MonitorDetailPanel`** does not read `monitorsManager.latest`: it owns a
   `MonitorDetailsState` (`monitors/monitor-details.svelte.ts`) that fetches its monitor with
   `getMonitorDetails(id)`, so it can show a monitor that has no reading for the map's
   pollutant, or is inactive. `choosePanelPollutant` (`monitors/panel-pollutant.ts`) picks
   what it shows: the map's pollutant when the monitor has it, otherwise the one it has. The
   panel re-fetches its monitor whenever `monitorsManager.latest` is replaced; `DataChart`
   takes `pollutant` and `refreshTick` props and reloads on a tick only while its date range
   is live (ended on the day it was chosen).
```

In the Commands section's sentence listing what Vitest covers, add `panel-pollutant`, `level-colors` and the date range helpers to the list of pure modules, and add `MonitorDetailsState` (`tests/monitors/monitor-details.test.ts`) next to `monitorsManager`.

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/lib/MonitorDetailPanel.svelte CLAUDE.md
git add src/lib/MonitorDetailPanel.svelte src/lib/monitors/panel-pollutant.ts CLAUDE.md
git commit -m "feat: the monitor detail panel loads its own monitor

The panel found its monitor in the map's current readings, which only hold
monitors with a reading for the selected pollutant. A PM2.5-only monitor
opened with ozone selected, an inactive monitor, or an unknown id rendered
a blank panel.

It now fetches the monitor itself and shows the map's pollutant when the
monitor has it, otherwise the one it has, with states for loading, not
found, failed and no current readings. The chart reloads on the map's
refresh only while its date range is live."
```

---

## After the last task

- Push the branch and open a pull request against `main`. Do not merge it and do not release.
- The pull request description should state that PurpleAir data boxes now show the cleaned value from the per-monitor endpoint until the backend returns the same stage everywhere (see the spec's Findings).
