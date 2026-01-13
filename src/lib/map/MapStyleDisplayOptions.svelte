<script lang="ts">
	import { MapStyle } from "@maptiler/sdk";
	import DisplayOption from "$lib/components/DisplayOption.svelte";
	import { mapState } from "./map.svelte";
	import { IntegrationsManager } from "./integrations/integrations-manager";

	const im = new IntegrationsManager();
	let currentStyle: keyof typeof MapStyle = $state("STREETS");

	$effect(() => {
		if (mapState.map && mapState.map?.getStyle().name?.toUpperCase() !== currentStyle) {
			mapState.map.once("style.load", async () => {
				//mc.prepareMap();
				//for (const integration of mc.integrations) {
				//	await mc.applyIntegration(integration);
				//}
				im.refresh();
			});

			mapState.map.setStyle(MapStyle[currentStyle]);
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
