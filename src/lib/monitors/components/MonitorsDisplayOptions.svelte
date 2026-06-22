<script lang="ts">
	import type { MonitorsMeta, SJVAirMonitorDeviceMeta } from "@sjvair/sdk";
	import DisplayOption from "$lib/components/DisplayOption.svelte";
	import SegmentedControl from "$lib/components/SegmentedControl.svelte";
	import ToggleSwitch from "$lib/components/ToggleSwitch.svelte";
	import { monitorsManager } from "../monitors.svelte";
	import { monitorsMapIntegration } from "../monitors-map-integration.svelte";

	interface PollutantDisplayOptions {
		label: string;
		value: MonitorsMeta["default_pollutant"];
	}

	const pollutants: Array<PollutantDisplayOptions> = [
		{
			label: "PM 2.5",
			value: "pm25"
		},
		{
			label: "Ozone",
			value: "o3"
		}
	];

	const monitorDisplayOptions = $derived.by(() => {
		if (monitorsManager.pollutant && monitorsManager.pollutant === "pm25")
			return Object.entries(monitorsMapIntegration.displayOptions);

		const validOptions = Object.entries(monitorsMapIntegration.displayOptions).filter(
			([key, opt]) =>
				key === "inactive" ||
				monitorsManager.meta?.asIter.monitors.some(
					(m: SJVAirMonitorDeviceMeta) =>
						m.label === opt.label &&
						monitorsManager.pollutant &&
						monitorsManager.pollutant in m.entries
				)
		);

		return validOptions;
	});

	$effect(() => {
		monitorsManager.list = [];
		monitorsManager.latest = null;
		monitorsManager.update();
	});
</script>

<DisplayOption>
	<p class="text-lg font-bold underline">Air Monitors</p>
	<div class="mb-2 w-full text-xs">
		<div class="w-fit">
			<ToggleSwitch
				id="monitor-clusters"
				label="Marker Clusters"
				bind:value={monitorsMapIntegration.clustered}
			></ToggleSwitch>
		</div>
		{#if monitorsManager.pollutant}
			<SegmentedControl
				segmentLabel="Pollutant:"
				options={pollutants}
				bind:group={monitorsManager.pollutant}
			/>
		{/if}
	</div>

	{#each monitorDisplayOptions as [id, option] (option.label)}
		{@const inputId = `${id}-monitor-display-option`}
		<label for={inputId} class="flex gap-1 cursor-pointer whitespace-nowrap select-none">
			<input type="checkbox" id={inputId} name={option.label} bind:checked={option.value} />
			{#if option.icon}
				<img class="w-3" src={option.icon.image.src} alt={option.icon.image.alt} />
			{/if}
			{option.label}
		</label>
	{/each}
</DisplayOption>
