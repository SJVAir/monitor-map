<script lang="ts">
	import { onDestroy } from "svelte";
	import LoadScreen, { disable } from "$lib/LoadScreen.svelte";
	import Map from "$lib/map/Map.svelte";
	import Menu from "$lib/map/Menu.svelte";
	import MonitorsDisplayOptions from "$lib/monitors/MonitorsDisplayOptions.svelte";
	import WindDisplayOptions from "$lib/wind/WindDisplayOptions.svelte";
	import MapStyleDisplayOptions from "$lib/map/MapStyleDisplayOptions.svelte";
	import { mapManager } from "$lib/map/map.svelte";
	import { monitorsManager } from "$lib/monitors/monitors.svelte";
	import { monitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte.ts";
	import { windMapIntegration } from "$lib/wind/wind.svelte";
	import { baseLayerSeperator } from "$lib/map/integrations/base-layer-seperator";
	import type { SomeMapIntegration } from "$lib/map/integrations/types";

	const integrations: Array<SomeMapIntegration> = [
		baseLayerSeperator,
		windMapIntegration,
		monitorsMapIntegration
	];

	monitorsManager.init();

	$effect(() => {
		if (mapManager.map && monitorsManager.initialized) {
			mapManager.map.once("idle", () => disable());
		}
	});

	onDestroy(() => {
		monitorsManager.autoUpdate.stop();
	});
</script>

<main>
	<LoadScreen />
	<Map {integrations} />
	<div class="absolute top-0 left-0 z-10 m-4">
		<Menu>
			<MonitorsDisplayOptions />
			<WindDisplayOptions />
			<MapStyleDisplayOptions />
		</Menu>
	</div>
</main>

<style>
	main {
		width: 100vw;
		height: 100vh;
	}
</style>
