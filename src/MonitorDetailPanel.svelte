<script lang="ts">
	import type { ComponentProps } from "svelte";
	import type { SJVAirEntryLevel } from "@sjvair/sdk";
	import DataBox from "$lib/components/DataBox.svelte";
	import { monitorsManager } from "$lib";
	import { navigate, route } from "./router";
	import { fetchTempByCoords } from "$lib/weather.ts";
	import { Colors, valueToColor } from "$lib/colors";
	import { getCurrentLevel } from "$lib/monitors/monitor-utils.ts";

	type TempDataBox = Pick<ComponentProps<typeof DataBox>, "color" | "value">;

	//let id = $derived(route.params.id ?? "");
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

<div class="flex h-full w-full flex-col overflow-y-auto bg-white">
	<div
		class="flex flex-col items-center justify-center gap-8 border-b border-gray-200 p-4 shadow-lg"
	>
		<button
			class="cursor-pointer self-end rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50"
			onclick={() => navigate("/")}
		>
			✕ Close
		</button>
		{#if monitor}
			<h2 class="text-center text-3xl font-semibold">{monitor.name}</h2>
			<div class="flex">
				<span class="border">
					<span
						class="block size-4 bg-blue-500 mask-[url(/icons/lungs.svg)] mask-size-[1rem_1rem] mask-center mask-no-repeat"
					></span>
					<a href={monitor.data_source.url} target="_blank" translate="no"
						>{monitor.data_source.name}</a
					>
				</span>
			</div>
		{/if}
	</div>
	<div class="mt-10 flex flex-col overflow-y-auto p-4">
		<div class="flex justify-around">
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
	</div>
</div>
