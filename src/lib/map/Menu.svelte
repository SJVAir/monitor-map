<script lang="ts">
	import { MonitorsController } from "$lib/monitors/monitors.svelte";

	const mc = new MonitorsController();
</script>

<div class="absolute top-0 left-0 m-4 flex-col rounded bg-white p-2 shadow">
	{#each Object.keys(mc.displayOptions) as label}
		<label for={label} class="m-2 cursor-pointer select-none">
			<input
				type="checkbox"
				id={label}
				name={label}
				bind:checked={mc.displayOptions[label as keyof typeof mc.displayOptions]}
			/>
			{label}
		</label>
	{/each}
</div>
