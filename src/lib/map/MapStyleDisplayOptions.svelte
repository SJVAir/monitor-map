<script lang="ts">
	import { MapStyle, MapStyleVariant, ReferenceMapStyle } from "@maptiler/sdk";
	import { mapManager, DefaultMapStyle } from "./map.svelte";
	import { integrationsManager } from "./integrations/integrations-manager";
	import DisplayOption from "$lib/components/DisplayOption.svelte";

	let currentMapStyle: MapStyleVariant = DefaultMapStyle;

	let selectedReferenceStyle: ReferenceMapStyle = $state(DefaultMapStyle.getReferenceStyle());
	let selectedVariant: MapStyleVariant = $state(DefaultMapStyle);

	const selectedStyleVariants: Array<MapStyleVariant> = $derived(
		selectedReferenceStyle.getVariants()
	);

	$effect(() => {
		const referenceStyleChanged: boolean =
			selectedReferenceStyle !== currentMapStyle.getReferenceStyle();
		const variantChanged: boolean = selectedVariant !== currentMapStyle;

		if (mapManager.map !== null) {
			if (referenceStyleChanged && !variantChanged) {
				selectedVariant = selectedReferenceStyle.getDefaultVariant();
			} else if (variantChanged) {
				console.log("running map style update effect!");
				mapManager.map.once("style.load", async () => {
					currentMapStyle = selectedVariant;
					integrationsManager.refresh();
				});

				mapManager.map.setStyle(selectedVariant);
			}
		}
	});
</script>

<DisplayOption>
	<p class="text-lg font-bold underline">Map Styles</p>
	<label for="mapStyleType">Style</label>
	<select
		id="mapStyleType"
		name="selectedOption"
		bind:value={selectedReferenceStyle}
		class="rounded border p-1"
	>
		{#each Object.values(MapStyle) as mapStyle, idx (idx)}
			<option value={mapStyle}>{mapStyle.getId()}</option>
		{/each}
	</select>
	<label for="mapStyleVariant">Variant</label>
	<select
		id="mapStyleType"
		name="selectedOption"
		bind:value={selectedVariant}
		class="rounded border p-1"
	>
		{#each selectedStyleVariants as variant, idx (idx)}
			<option value={variant}>{variant.getFullName()}</option>
		{/each}
	</select>
</DisplayOption>
