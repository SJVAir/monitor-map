# DataChart Layout Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix broken DataChart layout by collapsing the RangeCalendar behind a toggle, flattening controls into a single toolbar, giving the chart area an explicit height, and driving uPlot reflows via ResizeObserver.

**Architecture:** All changes are within `src/lib/data-chart/DataChart.svelte`. The script section gets new state (`calendarOpen`), a new derived (`dateRangeLabel`), an outside-click `$effect`, a rewritten `chartAttachment` using `ResizeObserver`, and an updated `downloadChart`. The template gets a new toolbar row and restructured chart area. The `<style>` block gets `.chart-area` and `.chart-canvas` classes.

**Tech Stack:** Svelte 5 runes, `{@attach}` attachment API, `ResizeObserver`, uPlot 1.6, date-fns 4, shadcn-svelte `RangeCalendar`, Tailwind CSS v4

---

## File Structure

| File                                  | Change                                 |
| ------------------------------------- | -------------------------------------- |
| `src/lib/data-chart/DataChart.svelte` | All changes — script, template, styles |

---

## Task 1: Script — add `calendarOpen`, `dateRangeLabel`, outside-click effect

**Files:**

- Modify: `src/lib/data-chart/DataChart.svelte`

- [ ] **Step 1: Add `calendarOpen` state and `dateRangeLabel` derived**

Add these two declarations directly after `let calendarValue = $state<CalendarRange | undefined>();`:

```ts
let calendarOpen = $state(false);

const dateRangeLabel = $derived(
	format(parseISO(manager.dateRange.start), "MMM d") +
		" – " +
		format(parseISO(manager.dateRange.end), "MMM d, yyyy")
);
```

- [ ] **Step 2: Add outside-click `$effect` for the calendar popover**

Add this effect after the existing `$effect(() => { if (monitor) loadChartData(); })`:

```ts
$effect(() => {
	if (!calendarOpen) return;
	function handleDocClick(e: MouseEvent) {
		const container = document.getElementById("date-range-container");
		if (container && !container.contains(e.target as Node)) {
			calendarOpen = false;
		}
	}
	document.addEventListener("click", handleDocClick);
	return () => document.removeEventListener("click", handleDocClick);
});
```

- [ ] **Step 3: Update `onUpdate` to close the calendar on submit**

Replace the existing `onUpdate` function:

```ts
function onUpdate() {
	if (calendarValue?.start && calendarValue?.end) {
		manager.dateRange = createDateRange(calendarValue.start, calendarValue.end);
	}
	calendarOpen = false;
	loadChartData();
}
```

- [ ] **Step 4: Run type-check**

```bash
npm run check
```

Expected: no new errors. (`uplotInstance` still exists at this point — it's removed in Task 2 alongside the attachment rewrite.)

---

## Task 2: Script — replace `chartAttachment`, remove `uplotInstance`, update `downloadChart`

**Files:**

- Modify: `src/lib/data-chart/DataChart.svelte`

- [ ] **Step 1: Remove `uplotInstance`, replace `chartAttachment`, and update `downloadChart` together**

These three changes must happen in one step because they all reference each other. Make the following three edits:

**Remove** the module-level variable:

```ts
let uplotInstance: uPlot | undefined;
```

**Replace** the entire `chartAttachment` function (the old one references `uplotInstance` and uses `setTimeout`/`parentElement`):

```ts
const chartAttachment: Attachment<HTMLElement> = (el) => {
	if (!manager.chartData.length) return;

	let instance: uPlot | undefined;
	let rafId: number;

	const rebuild = () => {
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

**Replace** the existing `downloadChart` function (queries the canvas element from the click target instead of using `uplotInstance`):

```ts
function downloadChart(e: MouseEvent) {
	if (!e.shiftKey) return;
	const canvas = (e.currentTarget as HTMLElement).querySelector(
		"canvas"
	) as HTMLCanvasElement | null;
	if (!canvas) return;
	const link = document.createElement("a");
	const monitorName = monitor.name.split(" ").join("-");
	const start = format(parseISO(manager.dateRange.start), "dd.MMM.yyyy");
	const end = format(parseISO(manager.dateRange.end), "dd.MMM.yyyy");
	link.download = `${monitorName}_${start}-${end}.png`;
	link.href = canvas.toDataURL();
	link.click();
}
```

- [ ] **Step 2: Run type-check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 3: Commit script changes**

```bash
git add src/lib/data-chart/DataChart.svelte
git commit -m "Refactor DataChart script: ResizeObserver, calendarOpen state, dateRangeLabel"
```

---

## Task 3: Template — toolbar row

**Files:**

- Modify: `src/lib/data-chart/DataChart.svelte`

- [ ] **Step 1: Replace the expand button + controls div with a single toolbar row**

Remove this block from the template (the expand `<button>` and the `<div class="mt-2 flex items-center justify-evenly gap-8">` controls row and the bottom `<div class="mr-8 self-end">` download button):

```svelte
<button
	class="absolute top-1 right-1 cursor-pointer rounded px-1 py-0.5 hover:bg-gray-100"
	onclick={() => (expanded = !expanded)}
	title={expanded ? "Collapse" : "Expand Chart"}
>
	{#if expanded}
		<!-- TODO: Get real icon -->
		✕
	{:else}
		<!-- TODO: Get real icon -->
		⛶
	{/if}
</button>

<div class="mt-2 flex items-center justify-evenly gap-8">
	<div>
		<span class="text-sm font-normal">Date Range</span>
		<RangeCalendar bind:value={calendarValue} />
	</div>
	<div>
		<button
			class="flex items-center gap-1 rounded border border-blue-400 bg-blue-500 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-600"
			onclick={onUpdate}
		>
			<span class:spin={manager.loading}>
				<!-- TODO: Get real icon -->
				↻
			</span>
			Update
		</button>
	</div>
</div>
```

And the bottom:

```svelte
<div class="mr-8 self-end">
	<button
		class="flex items-center gap-1 rounded border border-green-400 bg-green-500 px-2 py-1 text-xs font-semibold text-white hover:bg-green-600"
		onclick={downloadCSV}
	>
		<!-- TODO: Get real icon -->
		⬇ Download
	</button>
</div>
```

Replace with this single toolbar (placed as the first child inside `<div class="chart-panel" class:expanded>`):

```svelte
<div class="flex items-center gap-2 p-1">
	<button
		class="cursor-pointer rounded px-1 py-0.5 hover:bg-gray-100"
		onclick={() => (expanded = !expanded)}
		title={expanded ? "Collapse" : "Expand Chart"}
	>
		{#if expanded}
			<!-- TODO: Get real icon -->
			✕
		{:else}
			<!-- TODO: Get real icon -->
			⛶
		{/if}
	</button>

	<div class="relative" id="date-range-container">
		<button
			class="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
			onclick={() => (calendarOpen = !calendarOpen)}
		>
			{dateRangeLabel}
		</button>
		{#if calendarOpen}
			<div
				class="absolute top-full left-0 z-50 mt-1 rounded border border-gray-200 bg-white p-2 shadow-lg"
			>
				<RangeCalendar bind:value={calendarValue} />
			</div>
		{/if}
	</div>

	<button
		class="flex items-center gap-1 rounded border border-blue-400 bg-blue-500 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-600"
		onclick={onUpdate}
	>
		<span class:spin={manager.loading}>
			<!-- TODO: Get real icon -->
			↻
		</span>
		Update
	</button>

	<button
		class="ml-auto flex items-center gap-1 rounded border border-green-400 bg-green-500 px-2 py-1 text-xs font-semibold text-white hover:bg-green-600"
		onclick={downloadCSV}
	>
		<!-- TODO: Get real icon -->
		⬇ Download
	</button>
</div>
```

- [ ] **Step 2: Run type-check**

```bash
npm run check
```

Expected: no errors.

---

## Task 4: Template — chart area restructure

**Files:**

- Modify: `src/lib/data-chart/DataChart.svelte`

- [ ] **Step 1: Replace the chart area div + inner button with `.chart-area` + `.chart-canvas`**

Remove:

```svelte
<div class="relative min-h-93.75 flex-1">
	{#if manager.loading || noChartData}
		<div
			class="absolute inset-0 flex flex-col items-center justify-center text-center text-2xl font-bold"
		>
			<!-- TODO: Get real icon -->
			<span class:spin={manager.loading}>{manager.loading ? "↻" : "⚠"}</span>
			<br />
			{message}
		</div>
	{/if}
	<h2 class="text-center text-xl font-bold" class:invisible={manager.loading || noChartData}>
		{pollutantLabel} Readings
	</h2>
	<button
		aria-label="Download"
		class="h-full w-full"
		class:invisible={manager.loading || noChartData}
		onclick={downloadChart}
		{@attach chartAttachment}
	></button>
</div>
```

Replace with:

```svelte
<div class="chart-area relative">
	{#if manager.loading || noChartData}
		<div
			class="absolute inset-0 flex flex-col items-center justify-center text-center text-2xl font-bold"
		>
			<!-- TODO: Get real icon -->
			<span class:spin={manager.loading}>{manager.loading ? "↻" : "⚠"}</span>
			<br />
			{message}
		</div>
	{/if}
	<h2 class="text-center text-xl font-bold" class:invisible={manager.loading || noChartData}>
		{pollutantLabel} Readings
	</h2>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="chart-canvas"
		class:invisible={manager.loading || noChartData}
		onclick={downloadChart}
		{@attach chartAttachment}
	></div>
</div>
```

- [ ] **Step 2: Run type-check**

```bash
npm run check
```

Expected: no errors.

---

## Task 5: CSS — add `.chart-area` and `.chart-canvas`, update expanded styles

**Files:**

- Modify: `src/lib/data-chart/DataChart.svelte`

- [ ] **Step 1: Replace the entire `<style>` block**

Remove the existing `<style>` block and replace with:

```css
<style>
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
	.spin {
		display: inline-block;
		animation: spinner 1s linear infinite;
	}
	@keyframes spinner {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
```

- [ ] **Step 2: Run type-check and format**

```bash
npm run check && npm run format
```

Expected: no errors, formatting applied.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data-chart/DataChart.svelte
git commit -m "Refactor DataChart template and styles: toolbar, calendar popover, chart-area layout"
```

---

## Task 6: Browser verification

**Files:**

- None

- [ ] **Step 1: Start the dev server (if not running)**

```bash
npm run dev
```

- [ ] **Step 2: Navigate to a PurpleAir monitor detail page**

Open `http://localhost:5173/monitor/-B6kEcmkQ6-pYr15lHCiMg` (POM - Del Rey, PurpleAir).

Verify:

- Data boxes (Temperature, PM 2.5) are visible above the chart
- The chart panel shows a single toolbar row with: expand button · date-range toggle · Update button · Download button
- The calendar is NOT visible until the date-range toggle is clicked
- The chart renders at ~375px height with a visible colored gradient data line
- The "Data Provided Courtesy Of" section appears below the chart without overlap

- [ ] **Step 3: Test calendar popover**

Click the date-range toggle button. Verify:

- The RangeCalendar appears in a card below the toggle
- Clicking outside the card closes it
- Clicking the toggle again closes it
- Selecting a range and clicking Update reloads the chart with new data and closes the popover

- [ ] **Step 4: Test window resize**

Resize the browser window (drag the window edge). Verify:

- The chart redraws at the new width within one animation frame — no stale dimensions

- [ ] **Step 5: Test expand/collapse**

Click the `⛶` expand button. Verify:

- The fullscreen overlay appears
- The chart fills the panel at the new larger size (ResizeObserver handles this automatically)
- Clicking `✕` collapses back and chart redraws at original size

- [ ] **Step 6: Test shift-click PNG download**

Shift-click anywhere on the chart area. Verify a PNG file downloads named `<monitor-name>_<start>-<end>.png`.
