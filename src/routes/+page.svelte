<script lang="ts">
	import { onDestroy } from "svelte";
	import Map from "$lib/map/Map.svelte";
	import Menu from "$lib/map/Menu.svelte";
	import LoadingScreen from "$lib/loading/screen/LoadScreen.svelte";
	import MonitorsDisplayOptions from "$lib/monitors/MonitorsDisplayOptions.svelte";
	import WindDisplayOptions from "$lib/wind/WindDisplayOptions.svelte";
	import MapStyleDisplayOptions from "$lib/map/MapStyleDisplayOptions.svelte";
	import { MonitorsManager } from "$lib/monitors/monitors.svelte";
	import {} from "$lib/monitors/monitors-map-integration.svelte.ts";
	import { WindMapIntegration } from "$lib/wind/wind.svelte";
	import { BaseLayerSeperator } from "$lib/map/integrations/base-layer-seperator";
	import type { SomeMapIntegration } from "$lib/map/integrations/types";

	const mm = new MonitorsManager();
	const integrations: Array<SomeMapIntegration> = [
		new BaseLayerSeperator(),
		new WindMapIntegration()
		//new MonitorsMapIntegration()
	];

	await mm.init();

	onDestroy(() => {
		mm.autoUpdate.stop();
	});
</script>

<main>
	<LoadingScreen />
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
