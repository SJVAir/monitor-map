<script lang="ts">
	import { MapStyle } from "@maptiler/sdk";
	import DisplayOption from "$lib/components/DisplayOption.svelte";
	import { MapController } from "./map.svelte";

	const mc = new MapController();
	let currentStyle: keyof typeof MapStyle = $state("STREETS");

	$effect(() => {
		if (mc.initialized && mc.map?.getStyle().name?.toUpperCase() !== currentStyle) {
			mc.updateMapStyle(currentStyle);
		}
	});
</script>

<DisplayOption>
	<p class="text-lg font-bold underline">Map Styles</p>
	<select
		id="myDropdown"
		name="selectedOption"
		bind:value={currentStyle}
		class="rounded border p-1"
	>
		{#each Object.keys(MapStyle) as label}
			<option value={label}>{label}</option>
		{/each}
	</select>
</DisplayOption>
