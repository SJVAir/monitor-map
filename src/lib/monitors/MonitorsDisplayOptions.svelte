<script lang="ts">
	import type { MonitorsMeta } from "@sjvair/sdk";
	import DisplayOption from "$lib/components/DisplayOption.svelte";
	import SegmentedControl from "$lib/components/SegmentedControl.svelte";
	import ToggleSwitch from "$lib/components/ToggleSwitch.svelte";
	import { monitorsManager } from "./monitors.svelte";
	import { monitorsMapIntegration } from "./monitors-map-integration.svelte";

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
			<div class="w-4/5">
				<SegmentedControl
					segmentLabel="Pollutant:"
					options={pollutants}
					bind:group={monitorsManager.pollutant}
				/>
			</div>
		{/if}
	</div>

	{#each Object.entries(monitorsMapIntegration.displayOptions) as [id, option] (option.label)}
		{@const inputId = `${id}-monitor-display-option`}
		<label for={inputId} class="cursor-pointer whitespace-nowrap select-none">
			<input type="checkbox" id={inputId} name={option.label} bind:checked={option.value} />
			{option.label}
		</label>
	{/each}
</DisplayOption>
