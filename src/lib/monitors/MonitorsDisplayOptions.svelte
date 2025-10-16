<script lang="ts">
	import DisplayOption from "$lib/components/DisplayOption.svelte";
	import { MonitorsController } from "$lib/monitors/monitors.svelte";

	const mc = new MonitorsController();
</script>

{#if mc.meta}
	<DisplayOption>
		<p class="text-lg font-bold underline">Air Monitors</p>
		{#each Object.keys(mc.displayToggles) as label}
			<label for={label} class="cursor-pointer whitespace-nowrap select-none">
				<input
					type="checkbox"
					id={label}
					name={label}
					bind:checked={mc.displayToggles[label as keyof typeof mc.displayToggles]}
				/>
				{mc.displayOptions[label as keyof typeof mc.displayToggles]}
			</label>
		{/each}
	</DisplayOption>
{/if}
