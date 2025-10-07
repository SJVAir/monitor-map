<script>
	import { MonitorsController } from "$lib/monitors/monitors.svelte";

	const mc = new MonitorsController();
	$effect(() => {
		console.log(mc.displayOptions);
	});
</script>

<div>
	{#each Object.keys(mc.displayOptions) as label}
		<label for={label} class="m-2 cursor-pointer select-none">
			<input type="checkbox" id={label} name={label} bind:checked={mc.displayOptions[label]} />
			{label}
		</label>
	{/each}
</div>
