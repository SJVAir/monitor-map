# Data Chart: Vue → Svelte 5 Conversion Design

**Date:** 2026-05-20
**Branch:** feat/monitor-details

## Overview

Convert the `data-chart` module from Vue 3 (`DataChart.vue` + `Chart.vue`) to Svelte 5. The two Vue files consolidate into a single `DataChart.svelte` component. Most logic moves into a `data-chart.svelte.ts` file following the same class-based pattern as `monitors.svelte.ts`. All Bulma CSS is replaced with Tailwind utilities, dayjs/dateUtil is replaced with date-fns, and the Vue date picker is replaced with shadcn-svelte's range-calendar.

---

## File Structure

**New / updated:**
```
src/lib/data-chart/
  data-chart.svelte.ts   ← NEW: DataChartManager class
  DataChart.svelte       ← NEW: replaces Chart.vue + DataChart.vue
  DateRange.ts           ← UPDATE: class → plain type + factory function
  requests.ts            ← UPDATE: dayjs → date-fns, remove Dayjs type imports
  chart-utils.ts         ← UPDATE: dateUtil → date-fns
  tooltip.ts             ← UPDATE: dateUtil → date-fns
```

**Deleted:**
```
src/lib/data-chart/Chart.vue
src/lib/data-chart/DataChart.vue
```

**Install (included in implementation plan):**
- `npx shadcn-svelte@latest init`
- `npx shadcn-svelte@latest add range-calendar`

---

## DataChartManager (`data-chart.svelte.ts`)

A plain class (not a singleton) with `$state` rune properties. Instantiated directly inside `DataChart.svelte` — one instance per component, naturally scoped to the panel's lifetime.

```ts
class DataChartManager {
  dateRange: DateRange = $state(createDateRange());
  chartData: uPlot.AlignedData = $state([]);
  loading: boolean = $state(false);
}

export type { DataChartManager };
```

No setters — all properties are mutated directly by the component. `DataChartManager` is not exported as a value; only its type is exported (for typing if needed elsewhere).

---

## DateRange (`DateRange.ts`)

The `DateRange` class is removed. Replaced with a plain type and a factory function:

```ts
export type DateRange = { start: string; end: string };

export function createDateRange(start?: DateValue, end?: DateValue): DateRange {
  // Default: yesterday (start of day) → now
  // If end is not today: snap to end of day
  // Returns { start: ISOString, end: ISOString }
}
```

`DateValue` comes from `@internationalized/date` (installed by shadcn-svelte as a peer dependency). When called with no arguments, returns the default last-24-hours range.

---

## DataChart.svelte

Single component replacing both Vue files. Receives the active monitor as a prop.

**Props:**
```ts
let { monitor }: { monitor: MonitorLatestType<"pm25" | "o3"> } = $props();
```

**State:**
```ts
const manager = new DataChartManager();
let expanded = $state(false);
let calendarValue = $state<{ start: DateValue; end: DateValue } | undefined>();
```

**Data loading:** A `$effect` triggers `loadChartData()` when `monitor` changes. The component calls `fetchChartData(monitor, manager.dateRange)` from `requests.ts` and assigns the result to `manager.chartData`. `manager.loading` is set before and after the fetch.

```ts
$effect(() => {
  if (monitor) loadChartData();
});

async function loadChartData() {
  manager.loading = true;
  manager.chartData = await fetchChartData(monitor, manager.dateRange);
  manager.loading = false;
}
```

**Chart rendering — Svelte 5 attachment:** uPlot is initialized and torn down via `{@attach}`. The attachment reads `manager.chartData` and `expanded`, so it re-runs reactively when either changes. On `expanded` change, a `setTimeout(0)` defers the rebuild until after the CSS transition completes and the container has its new dimensions.

```ts
const chartAttachment: Attachment<HTMLElement> = (el) => {
  if (!manager.chartData.length) return;

  let instance: uPlot | undefined;

  const rebuild = () => {
    instance?.destroy?.();
    el.innerHTML = "";
    const { width, height } = el.getBoundingClientRect();
    const opts = getChartConfig(monitor.type, maxDiff, width, height * 0.8);
    instance = new uPlot(opts, manager.chartData, el);
  };

  // Defer rebuild on expand/collapse to let CSS transition finish
  if (expanded) {
    setTimeout(rebuild, 0);
  } else {
    rebuild();
  }

  return () => { instance?.destroy?.(); el.innerHTML = ""; };
};
```

**Update button flow:**
1. User selects range in shadcn range-calendar → `calendarValue` updates
2. User clicks "Update" → `manager.dateRange = createDateRange(calendarValue.start, calendarValue.end)` → `loadChartData()`

**CSV download:**
```ts
function downloadCSV() {
  const url = getMonitorEntriesCSVUrl({
    monitorId: monitor.id,
    entryType: monitorsManager.pollutant ?? "pm25",
    timestampGte: manager.dateRange.start,
    timestampLte: manager.dateRange.end,
  });
  window.open(url);
}
```

**Chart PNG download:** Shift+click on the chart div triggers a canvas download. The filename uses `format(parseISO(manager.dateRange.start), "dd.MMM.yyyy")` / `format(parseISO(manager.dateRange.end), "dd.MMM.yyyy")`.

**Expand/collapse:** `expanded` toggles a fullscreen overlay. In expanded state the component renders a fixed backdrop (`fixed inset-0 z-[9000] bg-black/50 backdrop-blur-sm`) with the chart panel centered inside it. In normal state the chart lives inline within `MonitorDetailPanel`.

**Loading / empty states:** An overlay message is shown when `manager.loading` is true ("Loading Data") or `manager.chartData` is empty ("No Data Available For Selected Date Range"). The uPlot container is hidden (not unmounted) during these states so attachment cleanup isn't triggered unnecessarily.

---

## requests.ts

`fetchChartData` signature is unchanged. Internal dayjs usage is replaced:

| Old | New |
|-----|-----|
| `dateUtil(ts).utc().tz(...)` | Removed — rely on browser locale |
| `dateUtil(ts).unix()` | `getUnixTime(new Date(ts))` |
| `prevTimestamp.skewedDiff(...)` gap check | `Math.abs(differenceInMinutes(a, b)) > updateDuration + 1` |
| `prevTimestamp.add(updateDuration, "m")` | `addMinutes(prevTimestamp, updateDuration)` |
| `xAxisData: Array<Dayjs>` | `xAxisData: Array<Date>` |

---

## chart-utils.ts

The x-axis `range` function uses `isToday` and `fromUnixTime` from date-fns:

```ts
range: (_, min, max) => {
  const maxDate = fromUnixTime(max);
  const now = new Date();
  max = isToday(maxDate) && isAfter(now, maxDate) ? getUnixTime(now) : max;
  return [min, max];
}
```

The `primaryPollutant` import is updated to read from `monitorsManager.pollutant`.

---

## tooltip.ts

`dateUtil.$prettyPrint(dateUtil.unix(xVal))` replaced with:
```ts
format(fromUnixTime(xVal), "MMM d, yyyy h:mm a")
```

---

## Icons

All `material-symbols-outlined` and custom SVG icon references replaced with UTF-8 characters. A `// TODO: Get real icon` comment is placed on the line above each substitution.

| Icon | Replacement |
|------|-------------|
| Expand/fullscreen | `⛶` |
| Close | `✕` |
| Refresh | `↻` |
| Download | `⬇` |
| Error/warning | `⚠` |

---

## Tailwind / Bulma Migration

All Bulma utility classes (`is-flex`, `is-align-items-center`, `card`, `button is-small is-info`, etc.) are replaced with Tailwind equivalents. Key mappings:

| Bulma | Tailwind |
|-------|----------|
| `is-flex is-align-items-center` | `flex items-center` |
| `is-justify-content-space-evenly` | `justify-evenly` |
| `card pt-2 pb-4` | `rounded bg-white shadow p-2 pb-4` |
| `button is-small is-info` | `rounded border border-blue-400 bg-blue-500 text-white text-xs px-2 py-1` |
| `button is-small is-success` | `rounded border border-green-400 bg-green-500 text-white text-xs px-2 py-1` |
| `has-text-weight-semibold` | `font-semibold` |

The fullscreen backdrop:
```
fixed inset-0 z-[9000] bg-black/50 backdrop-blur-sm flex items-center justify-center
```

The expanded chart panel:
```
relative flex flex-col gap-4 rounded bg-white p-4 w-[90%] h-[68vh]
```

---

## Out of Scope

Optimizations to the data-chart module (chart config, tooltip rendering, series gap logic) are explicitly deferred to a follow-up task.
