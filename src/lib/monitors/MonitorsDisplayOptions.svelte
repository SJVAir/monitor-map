<script lang="ts">
	import DisplayOption from "$lib/components/DisplayOption.svelte";
	import ToggleSwitch from "$lib/components/ToggleSwitch.svelte";
	import { monitorsMapIntegration } from "./monitors-map-integration.svelte";
</script>

<DisplayOption>
	<p class="text-lg font-bold underline">Air Monitors</p>
	<div class="mb-2 text-xs">
		<ToggleSwitch
			id="monitor-clusters"
			label="Marker Clusters"
			bind:value={monitorsMapIntegration.clustered}
		></ToggleSwitch>
	</div>

	{#each Object.entries(monitorsMapIntegration.displayOptions) as [id, option] (option.label)}
		{@const inputId = `${id}-monitor-display-option`}
		<label for={inputId} class="cursor-pointer whitespace-nowrap select-none">
			<input type="checkbox" id={inputId} name={option.label} bind:checked={option.value} />
			{option.label}
		</label>
	{/each}
</DisplayOption>
