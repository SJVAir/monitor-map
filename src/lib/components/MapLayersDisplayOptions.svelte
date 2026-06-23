<script lang="ts">
	import { WindIcon, CrosshairIcon, WavesVerticalIcon } from "@lucide/svelte";
	import DisplayOption from "$lib/components/DisplayOption.svelte";
	import ToggleSwitch from "$lib/components/ToggleSwitch.svelte";
	import { windMapIntegration } from "$lib/wind/wind.svelte";
	import { collocationSitesMapIntegration } from "$lib/collocation-sites/collocations-map-integration.svelte";
	import { monitorsManager } from "$lib/monitors/monitors.svelte";
	import { hmsFireMapIntegration } from "$lib/hms/hms-fire-map-integration.svelte";
	import { hmsSmokeMapIntegration } from "$lib/hms/hms-smoke-map-integration.svelte";

	const fireIcon = hmsFireMapIntegration.icons.get("hms-fire-xxl");
</script>

<DisplayOption>
	<p class="text-lg font-bold whitespace-nowrap underline">Map Layers</p>
	<div class="flex gap-1 items-center">
		<WindIcon size="16" />
		<ToggleSwitch id="wind" label="Wind" bind:value={windMapIntegration.enabled}></ToggleSwitch>
	</div>
	{#if monitorsManager.pollutant === "pm25"}
		<div class="flex gap-1 items-center">
			<CrosshairIcon size="16" color="#4A5FC6" />
			<ToggleSwitch
				id="collocation-sites"
				label="Collocation Sites"
				bind:value={collocationSitesMapIntegration.enabled}
			></ToggleSwitch>
		</div>
	{/if}
	<div class="flex gap-1 items-center">
		{#if fireIcon}
			<img class="w-4" src={fireIcon.image.src} alt={fireIcon.image.alt} />
		{/if}
		<ToggleSwitch id="hms-fire" label="HMS Fire" bind:value={hmsFireMapIntegration.enabled}
		></ToggleSwitch>
	</div>
	<div class="flex gap-1 items-center">
		<WavesVerticalIcon size="16" />
		<ToggleSwitch id="hms-smoke" label="HMS Smoke" bind:value={hmsSmokeMapIntegration.enabled}
		></ToggleSwitch>
	</div>
</DisplayOption>
