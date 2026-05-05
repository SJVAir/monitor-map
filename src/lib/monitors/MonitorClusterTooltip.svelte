<script lang="ts">
	//import { format, formatDistanceToNow } from "date-fns";
	import { GeoJSONSource } from "@maptiler/sdk";
	import DataBox from "$lib/components/DataBox.svelte";
	import { mapManager } from "$lib/map/map.svelte";
	import type { MonitorClusterMapFeature } from "./types";
	//import { monitorsManager } from "./monitors.svelte";
	//import { getCurrentLevel } from "./monitor-utils";
	//import type { SJVAirEntryLevel } from "@sjvair/sdk";
	import type { ComponentProps } from "svelte";

	interface MonitorClusterTooltipProps {
		feature: MonitorClusterMapFeature;
	}

	interface MonitorClusterTooltipData extends ComponentProps<typeof DataBox> {
		count: number;
	}

	const { feature }: MonitorClusterTooltipProps = $props();

	let data: MonitorClusterTooltipData | undefined = $state();

	$effect(() => {
		const source = mapManager.map!.getSource(feature.source)! as GeoJSONSource;
		source
			.getClusterLeaves(feature.properties.cluster_id, feature.properties.point_count, 0)
			.then((features) => {
				const avg = Math.round(
					feature.properties.sumValues / Math.max(feature.properties.point_count, 1)
				);

				data = {
					color: "#FF0000",
					count: feature.properties.point_count,
					header: feature.properties.cluster_id.toString(),
					subheading: "(Average)",
					value: avg.toString()
				};
			});
	});
	//const data = $derived.by(() => {
	//	const monitor = monitorsManager.latest?.get(feature.properties.id);

	//	if (!monitor || !monitorsManager.meta) return;

	//	const entryType = monitorsManager.meta.entryType(monitor.latest.entry_type);
	//	const level: SJVAirEntryLevel | undefined = getCurrentLevel(
	//		monitor.latest.value,
	//		entryType.asIter.levels!
	//	);

	//	const updateDuration = monitorsManager.meta.monitorType(monitor.type).expected_interval;

	//	return {
	//		color: level?.color ?? "",
	//		header: entryType.label,
	//		date: {
	//			formatted: format(monitor.latest.timestamp, "h:mm:aaa EEEE MMM dd, yyyy"),
	//			diference: formatDistanceToNow(monitor.latest.timestamp, {
	//				addSuffix: true,
	//				includeSeconds: true
	//			})
	//		},
	//		subheading: `(${updateDuration} avg)`,
	//		value: Math.round(parseInt(monitor.latest.value, 10)).toString()
	//	};
	//});
</script>

{#if data}
	<div class="flex gap-2">
		<DataBox
			color={data.color}
			header={data.header}
			subheading={data.subheading}
			value={data.value}
		/>
		<!--
		<div class="flex flex-col">
			<p>{data.date.formatted}</p>
			<h1 class="text-lg font-bold underline">{feature.properties.name}</h1>
			<div class="mt-auto">
				<p class="text-base leading-none">Last updated</p>
				<p class="text-base leading-none">{data.date.diference}</p>
			</div>
		</div>
    -->
	</div>
{/if}
