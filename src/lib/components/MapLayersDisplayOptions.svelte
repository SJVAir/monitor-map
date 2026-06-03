<script lang="ts">
	import DisplayOption from "$lib/components/DisplayOption.svelte";
	import ToggleSwitch from "$lib/components/ToggleSwitch.svelte";
	import { windMapIntegration } from "$lib/wind/wind.svelte";
	import { collocationSitesMapIntegration } from "$lib/collocation-sites/collocations-map-integration.svelte";
	import { monitorsManager } from "$lib/monitors/monitors.svelte";
	import { hmsFireMapIntegration } from "$lib/hms/hms-fire-map-integration.svelte";
	import { hmsSmokeMapIntegration } from "$lib/hms/hms-smoke-map-integration.svelte";
</script>

<DisplayOption>
	<p class="text-lg font-bold whitespace-nowrap underline">Map Layers</p>
	<ToggleSwitch id="wind" label="Wind" bind:value={windMapIntegration.enabled}></ToggleSwitch>
	{#if monitorsManager.pollutant === "pm25"}
		<ToggleSwitch
			id="collocation-sites"
			label="Collocation Sites"
			bind:value={collocationSitesMapIntegration.enabled}
		></ToggleSwitch>
	{/if}
	<ToggleSwitch id="hms-fire" label="HMS Fire" bind:value={hmsFireMapIntegration.enabled}
	></ToggleSwitch>
	<ToggleSwitch id="hms-smoke" label="HMS Smoke" bind:value={hmsSmokeMapIntegration.enabled}
	></ToggleSwitch>
</DisplayOption>
