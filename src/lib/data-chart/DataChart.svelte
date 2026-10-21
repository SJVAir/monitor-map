<script lang="ts">
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

	const chartManager = new DataChartManager();
	let expanded = $state(false);
	let calendarValue = $state<CalendarRange | undefined>({
		start: parseAbsolute(chartManager.dateRange.start, "America/Los_Angeles"),
		end: parseAbsolute(chartManager.dateRange.end, "America/Los_Angeles")
	});
	let dataRange = $state<CalendarRange | undefined>();
	let calendarOpen = $state(false);
	let dateRangeContainer: HTMLElement | undefined = $state();
	let triggerRebuild: (() => void) | undefined = $state();

	const dateRangeLabel = $derived(
		format(parseISO(chartManager.dateRange.start), "MMM d") +
			" – " +
			format(parseISO(chartManager.dateRange.end), "MMM d, yyyy")
	);

	// A request with no entries still resolves to [[], []], so test the x axis, not the tuple.
	const noChartData = $derived(!chartManager.chartData[0]?.length);
	const message = $derived(
		chartManager.loading
			? "Loading Data"
			: noChartData
				? "No Data Available For Selected Date Range"
				: ""
	);
	const pollutantLabel = $derived(pollutant === "pm25" ? "PM 2.5" : "Ozone");
	// Level definitions are shared metadata, not the map's current selection.
	const colors = $derived(
		levelColors(monitorsManager.meta?.entryType(pollutant).asIter.levels ?? [])
	);

	// Reload for another monitor or pollutant, not for a new object describing the same one.
	// Both go through a $derived: the owner recomputes what it passes on every refresh, and a
	// prop read directly would re-run this effect even when the value is unchanged.
	const monitorId = $derived(monitor.id);
	const chartPollutant = $derived(pollutant);
	$effect(() => {
		void monitorId;
		void chartPollutant;
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

	$effect(() => {
		if (!calendarOpen) return;
		function handleDocClick(e: MouseEvent) {
			if (dateRangeContainer && !dateRangeContainer.contains(e.target as Node)) {
				if (!calendarValue?.start || !calendarValue?.end) {
					calendarValue = dataRange;
				}
				calendarOpen = false;
			}
		}
		document.addEventListener("click", handleDocClick);
		return () => document.removeEventListener("click", handleDocClick);
	});

	$effect(() => {
		void chartManager.chartData; // re-run whenever chart data updates
		triggerRebuild?.();
	});

	const chartAttachment: Attachment<HTMLElement> = (el) => {
		let instance: uPlot | undefined;
		let rafId: number;

		const rebuild = () => {
			if (!chartManager.chartData.length) return;
			const { width, height } = el.getBoundingClientRect();
			if (!width || !height) return;
			const flatData = (chartManager.chartData.slice(1).flat() as (number | null)[]).filter(
				(v): v is number => v !== null
			);
			if (!flatData.length) return;
			instance?.destroy?.();
			el.innerHTML = "";
			const maxDiff = Math.max(...flatData) - Math.min(...flatData);
			const opts = getChartConfig(monitor.type, maxDiff, width, height, colors, pollutantLabel);
			instance = new uPlot(opts, chartManager.chartData, el);
		};

		triggerRebuild = rebuild;

		const ro = new ResizeObserver(() => {
			cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(rebuild);
		});
		ro.observe(el);

		return () => {
			triggerRebuild = undefined;
			cancelAnimationFrame(rafId);
			ro.disconnect();
			instance?.destroy?.();
			el.innerHTML = "";
		};
	};

	let chartRequest = 0;
	let chartController: AbortController | undefined;

	// A closed panel cancels its in-flight fetch.
	$effect(() => () => chartController?.abort());

	// `silent` keeps the current chart on screen while a timed refresh loads.
	async function loadChartData({ silent = false } = {}) {
		const request = ++chartRequest;
		chartController?.abort();
		const controller = (chartController = new AbortController());
		if (!silent) chartManager.loading = true;
		let data: Awaited<ReturnType<typeof fetchChartData>>;
		try {
			data = await fetchChartData(monitor, chartManager.dateRange, pollutant, {
				signal: controller.signal
			});
		} catch (err) {
			// Superseded or closed: the newer call owns `loading` and the chart, so leave both.
			if (controller.signal.aborted) return;
			throw err;
		}
		// A newer request (another range, monitor, pollutant or refresh) owns the chart now.
		if (request !== chartRequest) return;
		// A failed request resolves to [] (an empty range is [[], []]); a background refresh
		// that failed keeps the chart already on screen.
		if (silent && data.length === 0) return;
		chartManager.chartData = data;
		chartManager.loading = false;
	}

	function onUpdate() {
		if (calendarValue?.start && calendarValue?.end) {
			dataRange = calendarValue;
			chartManager.dateRange = createDateRange(dataRange.start, dataRange.end);
			live = includesToday(chartManager.dateRange);
			calendarOpen = false;
			loadChartData();
		}
	}

	function downloadCSV() {
		const url = getMonitorEntriesCSVUrl({
			monitorId: monitor.id,
			entryType: pollutant,
			timestampGte: chartManager.dateRange.start,
			timestampLte: chartManager.dateRange.end
		});
		window.open(url);
	}

	function downloadChart(e: MouseEvent) {
		if (!e.shiftKey) return;
		const canvas = (e.currentTarget as HTMLElement).querySelector(
			"canvas"
		) as HTMLCanvasElement | null;
		if (!canvas) return;
		const link = document.createElement("a");
		const monitorName = monitor.name.split(" ").join("-");
		const start = format(parseISO(chartManager.dateRange.start), "dd.MMM.yyyy");
		const end = format(parseISO(chartManager.dateRange.end), "dd.MMM.yyyy");
		link.download = `${monitorName}_${start}-${end}.png`;
		link.href = canvas.toDataURL();
		link.click();
	}

	function myAction(node: HTMLElement, expanded: boolean) {
		const parent = node.parentElement;
		const sibling = node.nextElementSibling;
		const mountpoint = document.getElementById("SJVAirMonitorMap");

		function update(expanded: boolean) {
			if (parent && mountpoint) {
				if (expanded) {
					// Start action logic (e.g., add event listeners)
					mountpoint.moveBefore(node, mountpoint.firstElementChild);
				} else {
					// Stop action logic (e.g., remove event listeners)
					parent.moveBefore(node, sibling);
				}
			}
		}

		update(expanded);

		return {
			update,
			destroy() {
				/* Clean up everything */
			}
		};
	}
</script>

<div use:myAction={expanded} class="backdrop" class:expanded>
	<div class="chart-panel" class:expanded>
		<div class="flex items-center justify-between gap-2 p-1">
			<div class={["relative", { "flex-1": expanded }]} bind:this={dateRangeContainer}>
				<button
					class="cursor-pointer rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
					aria-expanded={calendarOpen}
					onclick={() => (calendarOpen = !calendarOpen)}
				>
					{dateRangeLabel}
				</button>
				{#if calendarOpen}
					<div
						class="absolute top-full left-0 z-50 mt-1 rounded border border-gray-200 bg-white p-2 shadow-lg"
					>
						<RangeCalendar bind:value={calendarValue} maxDays={31} onValueChange={onUpdate} />
					</div>
				{/if}
			</div>

			<button
				class={[
					"cursor-pointer rounded border border-green-400 bg-green-500 px-2 py-1 text-xs font-semibold text-white hover:bg-green-600",
					{ "flex-none": expanded }
				]}
				onclick={downloadCSV}
			>
				<!-- TODO: Get real icon -->
				⬇ Download
			</button>

			<div class={["text-right", { "flex-1": expanded }]}>
				<button
					class="cursor-pointer rounded p-0.5 hover:bg-gray-100"
					onclick={() => (expanded = !expanded)}
					title={expanded ? "Collapse" : "Expand Chart"}
				>
					{#if expanded}
						<SquareX />
					{:else}
						<Maximize size={16} />
					{/if}
				</button>
			</div>
		</div>

		<div class="chart-area relative">
			{#if chartManager.loading || noChartData}
				<div
					class="absolute inset-0 flex flex-col items-center justify-center text-center text-2xl font-bold"
				>
					<!-- TODO: Get real icon -->
					<span class:spin={chartManager.loading}>{chartManager.loading ? "↻" : "⚠"}</span>
					<br />
					{message}
				</div>
			{/if}
			<h2
				class="text-center text-xl font-bold"
				class:invisible={chartManager.loading || noChartData}
			>
				{pollutantLabel} Readings
			</h2>
			<button
				aria-label="Download"
				class="chart-canvas"
				class:invisible={chartManager.loading || noChartData}
				onclick={downloadChart}
				{@attach chartAttachment}
			></button>
		</div>
	</div>
</div>

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
