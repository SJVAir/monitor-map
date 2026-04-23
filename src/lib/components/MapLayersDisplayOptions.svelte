<script lang="ts">
	import DisplayOption from "$lib/components/DisplayOption.svelte";
	import ToggleSwitch from "$lib/components/ToggleSwitch.svelte";
	import { windMapIntegration } from "$lib/wind/wind.svelte";
	import { collocationSitesMapIntegration } from "$lib/collocation-sites/collocations-map-integration.svelte";
</script>

<DisplayOption>
	<p class="text-lg font-bold whitespace-nowrap underline">Map Layers</p>
	<ToggleSwitch id="wind" label="Wind" bind:value={windMapIntegration.enabled}></ToggleSwitch>
	<ToggleSwitch
		id="collocation-sites"
		label="Collocation Sites"
		bind:value={collocationSitesMapIntegration.enabled}
	></ToggleSwitch>
</DisplayOption>
