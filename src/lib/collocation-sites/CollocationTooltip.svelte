<script lang="ts">
	import { format, formatDistanceToNow } from "date-fns";
	import DataBox from "$lib/components/DataBox.svelte";
	import type { CollocationSiteMapFeature } from "./types";
	import { monitorsManager } from "$lib/monitors/monitors.svelte";
	import { getCurrentLevel } from "$lib/monitors/monitor-utils";
	import type { MonitorLatest, SJVAirEntryLevel } from "@sjvair/sdk";

	interface CollocationTooltipProps {
		feature: CollocationSiteMapFeature;
	}

	const { feature }: CollocationTooltipProps = $props();

	const data = $derived.by(() => {
		const collocated = monitorsManager.latest?.get(feature.properties.colocated_id);
		const reference = monitorsManager.latest?.get(feature.properties.reference_id);

		return {
			collocated: getMonitorData(collocated),
			reference: getMonitorData(reference)
		};
	});

	function getMonitorData(monitor: MonitorLatest | undefined) {
		if (!monitor || !("value" in monitor.latest) || !monitorsManager.meta) return;

		const entryType = monitorsManager.meta.entryType(monitor.latest.entry_type);
		const level: SJVAirEntryLevel | undefined = getCurrentLevel(
			monitor.latest.value,
			entryType.asIter.levels!
		);

		const updateDuration = monitorsManager.meta.monitorType(monitor.type).expected_interval;

		return {
			color: level?.color ?? "",
			header: entryType.label,
			date: {
				formatted: format(monitor.latest.timestamp, "h:mm:aaa EEEE MMM dd, yyyy"),
				diference: formatDistanceToNow(monitor.latest.timestamp, {
					addSuffix: true,
					includeSeconds: true
				})
			},
			monitorName: monitor.name,
			subheading: `(${updateDuration} avg)`,
			value: Math.round(parseInt(monitor.latest.value, 10)).toString()
		};
	}
</script>

{#if data}
	<div class="flex flex-col gap-4">
		{#if data.reference}
			<div class="flex gap-2">
				<DataBox
					color={data.reference.color}
					header={data.reference.header}
					subheading={data.reference.subheading}
					value={data.reference.value}
				/>
				<div class="flex flex-col">
					<p class="leading-none">{data.reference.date.formatted}</p>
					<h1 class="text-lg font-bold underline">{data.reference.monitorName}</h1>
					<p class="leading-none">Reference monitor</p>
					<div class="mt-auto">
						<p class="text-base leading-none">Last updated</p>
						<p class="text-base leading-none">{data.reference.date.diference}</p>
					</div>
				</div>
			</div>
		{:else}
			<h1>Reference monitor offline</h1>
		{/if}
		{#if data.collocated}
			<div class="flex flex-row-reverse gap-2">
				<DataBox
					color={data.collocated.color}
					header={data.collocated.header}
					subheading={data.collocated.subheading}
					value={data.collocated.value}
				/>
				<div class="flex flex-col">
					<p class="leading-none">{data.collocated.date.formatted}</p>
					<h1 class="text-lg font-bold underline">{data.collocated.monitorName}</h1>
					<p class="leading-none">Collocated monitor</p>
					<div class="mt-auto">
						<p class="text-base leading-none">Last updated</p>
						<p class="text-base leading-none">{data.collocated.date.diference}</p>
					</div>
				</div>
			</div>
		{:else}
			<h1>Collocated monitor offline</h1>
		{/if}
	</div>
{/if}
