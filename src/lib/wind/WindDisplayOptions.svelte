<script lang="ts">
	import DisplayOption from "$lib/components/DisplayOption.svelte";
	import ToggleSwitch from "$lib/components/ToggleSwitch.svelte";
	import { windMapIntegration } from "./wind.svelte";
</script>

<DisplayOption>
	<p class="text-lg font-bold whitespace-nowrap underline">Map Layers</p>
	<ToggleSwitch id="wind" label="Wind" bind:value={windMapIntegration.enabled}></ToggleSwitch>
</DisplayOption>
