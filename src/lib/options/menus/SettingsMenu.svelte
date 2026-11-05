<script lang="ts">
	import type { MapContext } from "@sjvair/map-sdk";
	import { ContrastIcon, MapIcon, NetworkIcon, RotateCcwIcon, SettingsIcon } from "@lucide/svelte";
	import OptionsMenu from "../OptionsMenu.svelte";
	import CheckboxRow from "../rows/CheckboxRow.svelte";
	import RadioRow from "../rows/RadioRow.svelte";
	import { mapOptions, resetMapOptions } from "../map-options.svelte.js";
	import { asPollutant } from "../pollutant-param";
	import { basemapChoices, choiceForId, defaultBasemapId, switchBasemap } from "$lib/map/basemaps";
	import { monitorsManager } from "$lib/monitors/monitors.svelte.js";

	interface Props {
		map: MapContext;
	}

	let { map }: Props = $props();

	const choices = basemapChoices();
	// Reads map-sdk's selection, so a basemap that fails to load shows as reverted.
	const current = $derived(choiceForId(map.basemap.current));

	function reset() {
		resetMapOptions(asPollutant(monitorsManager.meta?.default_pollutant));
		map.basemap.select(defaultBasemapId());
	}
</script>

<OptionsMenu id="settings" label="Settings" iconOnly alignRight>
	{#snippet icon()}
		<SettingsIcon size={20} color="#696969" />
	{/snippet}
	<!-- Monitors' and EV chargers' clustering together. -->
	<CheckboxRow label="Marker Clusters" bind:checked={mapOptions.clustered}>
		{#snippet icon()}
			<NetworkIcon size={18} color="#1e90ff" />
		{/snippet}
	</CheckboxRow>
	<hr class="my-1 border-gray-200" />
	<div class="px-3 py-1.5 text-sm">
		<label for="monitor-map-basemap" class="mb-1 flex items-center gap-2 font-semibold">
			<MapIcon size={18} color="#708090" />
			Basemap
		</label>
		<select
			id="monitor-map-basemap"
			class="w-full rounded-md border border-gray-300 bg-white p-1.5"
			value={current?.name}
			onchange={(event) =>
				map.basemap.select(switchBasemap(map.basemap.current, event.currentTarget.value))}
		>
			{#each choices as choice (choice.name)}
				<option value={choice.name}>{choice.name}</option>
			{/each}
		</select>
	</div>
	<hr class="my-1 border-gray-200" />
	<p class="flex items-center gap-2 px-3 pt-1.5 text-sm font-semibold">
		<ContrastIcon size={18} color="#708090" />
		Theme
	</p>
	{#each current?.variants ?? [] as variant (variant.id)}
		<RadioRow
			name="monitor-map-theme"
			label={variant.name}
			checked={variant.id === map.basemap.current}
			onselect={() => map.basemap.select(variant.id)}
		/>
	{/each}
	<hr class="my-1 border-gray-200" />
	<div class="px-3 py-1.5">
		<button
			type="button"
			class="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
			onclick={reset}
		>
			<RotateCcwIcon size={16} />
			Reset Map Options
		</button>
	</div>
</OptionsMenu>
