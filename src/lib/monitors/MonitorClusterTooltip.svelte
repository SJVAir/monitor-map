<script lang="ts">
	//import { format, formatDistanceToNow } from "date-fns";
	import { GeoJSONSource } from "@maptiler/sdk";
	import { area } from "@turf/area";
	import { convertArea } from "@turf/helpers";
	import DataBox from "$lib/components/DataBox.svelte";
	import { mapManager } from "$lib/map/map.svelte";
	import type { MonitorClusterMapFeature, MonitorMapFeature } from "./types";
	import { monitorsManager } from "./monitors.svelte";
	import { getCurrentLevel } from "./monitor-utils";
	import type { SJVAirEntryLevel } from "@sjvair/sdk";
	import type { ComponentProps } from "svelte";
	import type { Geometry } from "geojson";

	interface MonitorClusterTooltipProps {
		feature: MonitorClusterMapFeature;
	}

	interface MonitorClusterTooltipData extends ComponentProps<typeof DataBox> {
		clusterType: string;
		count: number;
		coverage?: number;
	}

	const { feature }: MonitorClusterTooltipProps = $props();

	let data: MonitorClusterTooltipData | undefined = $state();

	$effect(() => {
		const source = mapManager.map!.getSource(feature.source)! as GeoJSONSource;
		const latest = monitorsManager.latest;
		const meta = monitorsManager.meta;

		source
			.getClusterLeaves(feature.properties.cluster_id, feature.properties.point_count, 0)
			.then((features) => {
				//const monitor = monitorsManager.latest?.get(feature.properties.id);

				if (!features.length || !meta || !latest) return;
				const monitors = (features as Array<MonitorMapFeature>).map((f) =>
					latest?.get(f.properties.id)
				);

				const firstMonitor = monitors[0];
				if (!firstMonitor) return;

				const entryType = meta.entryType(firstMonitor.latest.entry_type);
				const monitorType = meta.monitorType(firstMonitor.type);

				const coords = monitors.map((m) => m!.position!.coordinates);

				if (coords.length === 3) {
					coords.push(coords[0]);
				}
				const polygon = {
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [coords]
					}
				} as unknown as Geometry;

				const coverage = area(polygon);
				const avg = Math.round(
					monitors.reduce((sum, m) => sum + parseFloat(m?.latest.value ?? "0"), 0) / monitors.length
				);

				const level: SJVAirEntryLevel | undefined = getCurrentLevel(avg, entryType.asIter.levels!);

				data = {
					color: level?.color || "#d3d3d3",
					count: feature.properties.point_count,
					coverage: coverage > 0 ? convertArea(coverage, "meters", "miles") : undefined,
					header: entryType.label,
					clusterType: `${firstMonitor.is_sjvair ? "SJVAir " : ""}${monitorType.label} Monitors`,
					subheading: "(Average)",
					value: avg.toString()
				};
			});
	});
</script>

{#if data}
	<div class="flex gap-2">
		<DataBox
			color={data.color}
			header={data.header}
			subheading={data.subheading}
			value={data.value}
		/>
		<div class="flex flex-col items-center justify-center">
			<!--
			<p>{data.date.formatted}</p>
      -->
			<h1 class="text-lg font-bold underline">{data.clusterType}</h1>
			<p>{data.count} monitors covering {data.coverage?.toFixed(2)}m²</p>
			<!--
			<div class="mt-auto">
				<p class="text-base leading-none">Last updated</p>
				<p class="text-base leading-none">{data.date.diference}</p>
			</div>
      -->
		</div>
	</div>
{/if}
