<script lang="ts">
	import { MonitorsController } from "$lib/monitors/monitors.svelte";

	const mc = new MonitorsController();
</script>

{#if mc.meta}
	<div
		class="absolute top-0 left-0 w-fit flex-col items-center justify-center rounded bg-white p-2 shadow"
	>
		<p class="text-lg font-bold underline">Air Monitors</p>
		{#each Object.keys(mc.displayToggles) as label}
			<label for={label} class="m-2 cursor-pointer whitespace-nowrap select-none">
				<input
					type="checkbox"
					id={label}
					name={label}
					bind:checked={mc.displayToggles[label as keyof typeof mc.displayToggles]}
				/>
				{mc.displayOptions[label as keyof typeof mc.displayToggles]}
			</label>
		{/each}
	</div>
{/if}
