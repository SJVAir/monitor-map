<script lang="ts">
	import { MapStyle, MapStyleVariant, ReferenceMapStyle } from "@maptiler/sdk";
	import { mapManager, DefaultMapStyle } from "./map.svelte";
	import { integrationsManager } from "./integrations/integrations-manager";
	import DisplayOption from "$lib/components/DisplayOption.svelte";

	const allMapStyles: ReferenceMapStyle[] = (() => {
		const latest = new Map<string, { version: number; style: ReferenceMapStyle }>();
		for (const style of Object.values(MapStyle) as ReferenceMapStyle[]) {
			const id = style.getId();
			const match = id.match(/^(.+?)_V(\d+)$/i);
			const baseName = match ? match[1] : id;
			const version = match ? parseInt(match[2], 10) : 0;
			const existing = latest.get(baseName);
			if (!existing || version > existing.version) {
				latest.set(baseName, { version, style });
			}
		}
		return Array.from(latest.values()).map((e) => e.style);
	})();

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
		{#each allMapStyles as mapStyle, idx (idx)}
			<option value={mapStyle}>{mapStyle.getName()}</option>
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
			<option value={variant}>{variant.getName()}</option>
		{/each}
	</select>
</DisplayOption>
