<script lang="ts">
	import type { Attachment } from "svelte/attachments";
	import type { MonitorLatestType } from "@sjvair/sdk";
	import type { DateRange as CalendarRange } from "bits-ui";
	import uPlot from "uplot";
	import { getMonitorEntriesCSVUrl } from "@sjvair/sdk/monitors";
	import { format, parseISO } from "date-fns";
	import { RangeCalendar } from "$lib/components/ui/range-calendar";
	import { DataChartManager } from "./data-chart.svelte.ts";
	import { createDateRange } from "./DateRange.ts";
	import { fetchChartData } from "./requests.ts";
	import { getChartConfig } from "./chart-utils.ts";
	import { monitorsManager } from "../monitors/monitors.svelte";

	let { monitor }: { monitor: MonitorLatestType<"pm25" | "o3"> } = $props();

	const manager = new DataChartManager();
	let expanded = $state(false);
	let calendarValue = $state<CalendarRange | undefined>();
	let calendarOpen = $state(false);
	let dateRangeContainer: HTMLElement | undefined = $state();

	const dateRangeLabel = $derived(
		format(parseISO(manager.dateRange.start), "MMM d") +
			" – " +
			format(parseISO(manager.dateRange.end), "MMM d, yyyy")
	);

	const noChartData = $derived(!manager.chartData.length);
	const message = $derived(
		manager.loading
			? "Loading Data"
			: noChartData
				? "No Data Available For Selected Date Range"
				: ""
	);
	const pollutantLabel = $derived(monitorsManager.pollutant === "pm25" ? "PM 2.5" : "Ozone");

	$effect(() => {
		if (monitor) loadChartData();
	});

	$effect(() => {
		if (!calendarOpen) return;
		function handleDocClick(e: MouseEvent) {
			if (dateRangeContainer && !dateRangeContainer.contains(e.target as Node)) {
				calendarOpen = false;
			}
		}
		document.addEventListener("click", handleDocClick);
		return () => document.removeEventListener("click", handleDocClick);
	});

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

	async function loadChartData() {
		manager.loading = true;
		manager.chartData = await fetchChartData(monitor, manager.dateRange);
		manager.loading = false;
	}

	function onUpdate() {
		if (calendarValue?.start && calendarValue?.end) {
			manager.dateRange = createDateRange(calendarValue.start, calendarValue.end);
		}
		calendarOpen = false;
		loadChartData();
	}

	function downloadCSV() {
		const url = getMonitorEntriesCSVUrl({
			monitorId: monitor.id,
			entryType: monitorsManager.pollutant ?? "pm25",
			timestampGte: manager.dateRange.start,
			timestampLte: manager.dateRange.end
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
		const start = format(parseISO(manager.dateRange.start), "dd.MMM.yyyy");
		const end = format(parseISO(manager.dateRange.end), "dd.MMM.yyyy");
		link.download = `${monitorName}_${start}-${end}.png`;
		link.href = canvas.toDataURL();
		link.click();
	}
</script>

<div class="backdrop" class:expanded>
	<div class="chart-panel" class:expanded>
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

			<div class="relative" bind:this={dateRangeContainer}>
				<button
					class="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
					aria-expanded={calendarOpen}
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
