<script lang="ts">
	import { MonitorsController } from "$lib/monitors/monitors.svelte";
	import { WindMapIntegration } from "./wind.svelte";

	const mc = new MonitorsController();
	const wind = new WindMapIntegration();
</script>

{#if mc.meta}
	<div
		class="absolute top-0 left-0 flex w-fit items-center justify-center rounded bg-white p-2 shadow"
	>
		<div class="flex-col items-center justify-center">
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

		<div class="flex-col items-center justify-center">
			<p class="text-lg font-bold underline">Map Layers</p>
			<label for="wind" class="m-2 cursor-pointer whitespace-nowrap select-none">
				<input type="checkbox" id="wind" name="wind" bind:checked={wind.enabled} />
				Wind
			</label>
		</div>
	</div>
{/if}
