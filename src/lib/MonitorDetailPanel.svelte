<script lang="ts">
	import type { ComponentProps } from "svelte";
	import type { SJVAirEntryLevel } from "@sjvair/sdk";
	import DataBox from "$lib/components/DataBox.svelte";
	import MonitorWidgetModal from "$lib/monitors/components/MonitorWidgetModal.svelte";
	import MonitorSubscriptionManager from "$lib/monitors/components/MonitorSubscriptionManager.svelte";
	import DataChart from "$lib/data-chart/DataChart.svelte";
	import { monitorsManager } from "$lib";
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

	const monitor = $derived(monitorsManager.latest?.get(route.params.id ?? ""));
	let tempData: TempDataBox | undefined = $state();
	const entryData: ComponentProps<typeof DataBox> | undefined = $derived.by(() => {
		if (!monitor || !monitorsManager.meta) return;

		const entryType = monitorsManager.meta.entryType(monitor.latest.entry_type);
		const level: SJVAirEntryLevel | undefined = getCurrentLevel(
			monitor.latest.value,
			entryType.asIter.levels!
		);

		const updateDuration = monitorsManager.meta.monitorType(monitor.type).expected_interval;

		return {
			color: level?.color ?? "",
			header: entryType.label,
			subheading: `(${updateDuration} avg)`,
			value: Math.round(parseInt(monitor.latest.value, 10)).toString()
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

<div class="flex h-full w-full flex-col overflow-y-auto bg-white">
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
		{/if}
	</div>

	<div class="flex flex-col items-center gap-12 overflow-y-auto p-5 pt-10">
		{#if monitor}
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

			<MonitorWidgetModal monitorId={monitor.id} />
			<!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
			{#if (globalThis as any).USER?.is_authenticated}
				<MonitorSubscriptionManager monitorId={monitor.id} />
			{/if}

			<div class="w-full">
				<DataChart {monitor} />
			</div>

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
