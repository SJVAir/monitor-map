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

	// Through a $derived: the router replaces `route.params` on every navigation, including
	// a search-only change or Back to the same monitor, which must not reload the panel.
	const routeId = $derived(route.params.id);
	$effect(() => {
		const id = routeId;
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
		const label = meta.entryType(mapPollutant).label;
		// Mid-sentence: lowercase a plain word ("Ozone"), keep a symbol ("PM2.5") as written.
		const missing = /^[A-Z][a-z]+$/.test(label) ? label.toLowerCase() : label;
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

	// Re-run for each refreshed copy of the monitor, as before, but never show one monitor's
	// temperature on another: cleared when the id changes, and a late answer is dropped.
	let tempMonitorId: string | undefined;
	$effect(() => {
		const current = monitor;
		const id = current?.id;
		if (id !== tempMonitorId) {
			tempMonitorId = id;
			tempData = undefined;
		}
		if (!current?.position) return;
		fetchTempByCoords(current.position.coordinates)
			.then((temperature) => {
				if (untrack(() => monitor?.id) !== id) return;
				tempData = {
					value: `${temperature}°F`,
					color: valueToColor(temperature, tempColors)
				};
			})
			.catch(console.error);
	});
</script>

{#snippet badge(icon: string, label: string, opts: BadgeOpts = {})}
	<span
		class="flex items-center justify-center gap-1 rounded-sm border px-1 py-0.5
    {opts.bgClass ?? 'bg-neutral-100'}"
	>
		<span class={["svg-icon", icon, opts.iconColorClass ?? "bg-black/70"]}></span>
		{#if opts.href}
			<a class="text-link text-xs" href={opts.href} target="_blank" translate="no">{label}</a>
		{:else}
			<span
				class={["text-xs whitespace-nowrap", opts.labelColorClass ?? "text-black/70"]}
				translate="no">{label}</span
			>
		{/if}
	</span>
{/snippet}

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
