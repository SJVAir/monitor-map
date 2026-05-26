# DataChart Initial Render Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the DataChart render on initial monitor detail load without requiring a manual browser resize.

**Architecture:** `{@attach chartAttachment}` in `DataChart.svelte` runs once at mount before chart data arrives. A module-scoped `triggerRebuild` variable exposes the `rebuild` function from inside the attachment to the component's reactive layer. A `$effect` watches `manager.chartData` and calls `triggerRebuild()` whenever data changes, covering initial load, Update button submissions, and monitor prop changes.

**Tech Stack:** Svelte 5 runes (`$state`, `$effect`, `{@attach}`), uPlot 1.6, TypeScript

---

## File Structure

| File                                  | Change                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| `src/lib/data-chart/DataChart.svelte` | Add `triggerRebuild` variable; set/clear it in `chartAttachment`; add `$effect` |

---

## Task 1: Add reactive rebuild trigger to DataChart

**Files:**

- Modify: `src/lib/data-chart/DataChart.svelte`

No test framework is configured. Verification is via type-check + browser.

- [ ] **Step 1: Add the bridge variable**

Open `src/lib/data-chart/DataChart.svelte`. In the `<script>` block, after the existing `let` declarations (`let expanded`, `let calendarOpen`, `let calendarValue`, `let dateRangeContainer`), add:

```ts
let triggerRebuild: (() => void) | undefined;
```

- [ ] **Step 2: Expose `rebuild` from the attachment**

Inside the `chartAttachment` function, immediately after the `const rebuild = () => { ... };` closing brace, add one line:

```ts
triggerRebuild = rebuild;
```

The attachment block should look like:

```ts
const chartAttachment: Attachment<HTMLElement> = (el) => {
	let instance: uPlot | undefined;
	let rafId: number;

	const rebuild = () => {
		if (!manager.chartData.length) return;
		const { width, height } = el.getBoundingClientRect();
		if (!width || !height) return;
		const flatData = (manager.chartData.slice(1).flat() as (number | null)[]).filter(
			(v): v is number => v !== null
		);
		if (!flatData.length) return;
		instance?.destroy?.();
		el.innerHTML = "";
		const maxDiff = Math.max(...flatData) - Math.min(...flatData);
		const opts = getChartConfig(monitor.type, maxDiff, width, height);
		instance = new uPlot(opts, manager.chartData, el);
	};

	triggerRebuild = rebuild; // ← add this line

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

- [ ] **Step 3: Clear `triggerRebuild` in the attachment cleanup**

Inside the attachment's `return () => { ... }` cleanup function, add `triggerRebuild = undefined;` as the first line:

```ts
return () => {
	triggerRebuild = undefined; // ← add this line
	cancelAnimationFrame(rafId);
	ro.disconnect();
	instance?.destroy?.();
	el.innerHTML = "";
};
```

- [ ] **Step 4: Add the reactive effect**

After the last existing `$effect` block (the outside-click handler for the calendar), add:

```ts
$effect(() => {
	manager.chartData;
	triggerRebuild?.();
});
```

Reading `manager.chartData` without `.length` or any guard ensures the reactive subscription is created even when the array is empty, so the effect fires on every change — including the initial data load.

- [ ] **Step 5: Run type-check**

```bash
npm run check
```

Expected: no new errors. The `triggerRebuild` variable is typed as `(() => void) | undefined`, so `triggerRebuild?.()` is valid.

- [ ] **Step 6: Browser verification**

With the dev server running at `http://localhost:5173`, open `http://localhost:5173/monitor/-B6kEcmkQ6-pYr15lHCiMg` (POM - Del Rey, PurpleAir).

Without touching the browser window size, verify:

- The chart renders automatically once data loads (green/yellow PM 2.5 line visible below the toolbar)
- No horizontal scrollbar appears in the detail panel
- Clicking **Update** after selecting a new date range reloads and re-renders the chart correctly
- Expand (`⛶`) and collapse (`✕`) still work and the chart redraws at the new size

- [ ] **Step 7: Commit**

```bash
git add src/lib/data-chart/DataChart.svelte
git commit -m "Fix DataChart: trigger rebuild reactively when chartData changes"
```
