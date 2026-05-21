# DataChart Layout Fix & ResizeObserver

**Date:** 2026-05-21
**Branch:** feat/monitor-details

## Overview

Fix broken layout in `DataChart.svelte`: replace the always-visible RangeCalendar with a collapsed toggle, flatten all controls into a single toolbar row, give the chart area an explicit height, and drive uPlot reflows via `ResizeObserver` instead of `setTimeout`. Fixes chart-too-large, missing data boxes, and the window-resize non-response reported by users.

---

## Root Causes

| Bug                          | Cause                                                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Chart area wrong height      | `<button h-full>` inside a `min-height`-only parent; `height: 100%` resolves to `auto` with no explicit parent height |
| ResizeObserver missing       | uPlot dimensions only set once at mount; no response to window resize or panel expand                                 |
| Component too tall           | Full two-month `<RangeCalendar>` rendered inline above the chart                                                      |
| Download button floats oddly | `self-end` on a flex-column item with no explicit parent height                                                       |
| `setTimeout` expand hack     | Workaround for missing ResizeObserver                                                                                 |

---

## Section 1: Toolbar

A single `flex items-center gap-2` row at the top of `.chart-panel`. Left to right:

| Slot         | Element                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| Left         | Expand / collapse button (`⛶` / `✕`)                                                                   |
| Center-left  | Date-range toggle — shows current range, e.g. `"May 20 – May 21, 2026"`; opens/closes calendar popover |
| Center-right | `↻ Update` button                                                                                      |
| Right        | `⬇ Download` CSV button                                                                                |

The separate bottom download row (`self-end mr-8`) is removed. All controls live in one toolbar.

---

## Section 2: Calendar Popover

```ts
let calendarOpen = $state(false);
```

- Clicking the date-range toggle button sets `calendarOpen = !calendarOpen`
- The `<RangeCalendar>` renders only when `calendarOpen` is true, in an absolutely-positioned card below the toggle
- Outside-click closes the popover via a `$effect` that adds/removes a `document` click listener while `calendarOpen` is true

**Toggle label format:**

```ts
const dateRangeLabel = $derived(
	format(parseISO(manager.dateRange.start), "MMM d") +
		" – " +
		format(parseISO(manager.dateRange.end), "MMM d, yyyy")
);
```

---

## Section 3: Chart Area + ResizeObserver

The chart area is a flex column containing the title and the uPlot container:

```
div.chart-area   (height: 375px in normal mode; flex-1 + min-height: 0 in expanded mode)
  ├── h2  (auto height — "PM 2.5 Readings")
  └── div.chart-canvas  (flex: 1; min-height: 0)  ← {@attach chartAttachment}
```

`{@attach}` is placed on `div.chart-canvas`, not on a `<button>`. The attachment creates a `ResizeObserver`:

```ts
const chartAttachment: Attachment<HTMLElement> = (el) => {
	if (!manager.chartData.length) return;

	let instance: uPlot | undefined;
	let rafId: number;

	const rebuild = () => {
		const { width, height } = el.getBoundingClientRect();
		if (!width || !height) return;
		instance?.destroy?.();
		el.innerHTML = "";
		const flatData = (manager.chartData.slice(1).flat() as (number | null)[]).filter(
			(v): v is number => v !== null
		);
		const maxDiff = Math.max(...flatData) - Math.min(...flatData);
		const opts = getChartConfig(monitor.type, maxDiff, width, height);
		instance = new uPlot(opts, manager.chartData, el);
	};

	const ro = new ResizeObserver(() => {
		cancelAnimationFrame(rafId);
		rafId = requestAnimationFrame(rebuild);
	});
	ro.observe(el);

	return () => {
		cancelAnimationFrame(rafId);
		ro.disconnect();
		instance?.destroy?.();
		el.innerHTML = "";
	};
};
```

Key points:

- Dimensions read directly from `el.getBoundingClientRect()` — no `parentElement` indirection
- `requestAnimationFrame` debounces rapid resize events (window drag, CSS transitions) to one rebuild per frame
- The `setTimeout` expand hack is removed entirely
- The `<button>` wrapper for shift-click download is removed; `onclick={downloadChart}` moves to `div.chart-canvas` directly (with `a11y_no_static_element_interactions` suppression)

---

## Section 4: Expanded Mode

No structural change to the backdrop overlay.

```css
.backdrop {
	width: 100%;
}
.backdrop.expanded {
	position: fixed;
	inset: 0;
	z-index: 9000;
	background-color: rgba(0, 0, 0, 0.5);
	backdrop-filter: blur(8px);
	display: flex;
	align-items: center;
	justify-content: center;
}

.chart-panel {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: 1rem;
	padding: 0.5rem 0 1rem;
	width: 100%;
}
.chart-panel.expanded {
	width: 90%;
	height: 68vh;
	border-radius: 0.5rem;
	background: white;
	padding: 1rem;
	box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.chart-area {
	display: flex;
	flex-direction: column;
	height: 375px;
}
.chart-panel.expanded .chart-area {
	flex: 1;
	min-height: 0;
	height: auto;
}

.chart-canvas {
	flex: 1;
	min-height: 0;
}
```

When `expanded` toggles, the CSS transition completes and the ResizeObserver fires on the next animation frame, automatically rebuilding the chart at the correct new dimensions.

---

## Files Changed

- `src/lib/data-chart/DataChart.svelte` — all changes are within this one file
