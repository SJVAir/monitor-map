<script lang="ts">
	import DisplayOption from "$lib/components/DisplayOption.svelte";
	import { monitorsMapIntegration } from "./monitors-map-integration.svelte";
</script>

	<DisplayOption>
		<p class="text-lg font-bold underline">Air Monitors</p>
		<label for="monitor-clusters" class="cursor-pointer whitespace-nowrap select-none">
			<input
				type="checkbox"
				id="monitor-clusters"
				name="monitor-clusters"
				bind:checked={monitorsMapIntegration.clustered}
			/>
			Enable Clusters
		</label>

	{#each Object.entries(monitorsMapIntegration.displayOptions) as [id, option] (option.label)}
		</label>

		{#each Object.values(monitorsMapIntegration.displayOptions) as option (option.label)}
			<label for={option.label} class="cursor-pointer whitespace-nowrap select-none">
				<input type="checkbox" id={option.label} name={option.label} bind:checked={option.value} />
				{option.label}
			</label>
		{/each}
	</DisplayOption>
