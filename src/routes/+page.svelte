<script lang="ts">
	import { onDestroy } from "svelte";
	import Map from "$lib/map/Map.svelte";
	import Menu from "$lib/map/Menu.svelte";
	import LoadingScreen from "$lib/loading/screen/LoadScreen.svelte";
	import MonitorsDisplayOptions from "$lib/monitors/MonitorsDisplayOptions.svelte";
	import WindDisplayOptions from "$lib/wind/WindDisplayOptions.svelte";
	import MapStyleDisplayOptions from "$lib/map/MapStyleDisplayOptions.svelte";
	import { MonitorsController } from "$lib/monitors/monitors.svelte";
	import { MonitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte.ts";
	import { WindMapIntegration } from "$lib/wind/wind.svelte";
	import { BaseLayerSeperator } from "$lib/map/integrations/base-layer-seperator";
	import { IntegrationsManager } from "$lib/map/integrations/integrations-manager";

	const monitors = new MonitorsController();
	//const integrationsManager = new IntegrationsManager();

	//integrationsManager.register(
	//	new BaseLayerSeperator(),
	//	new WindMapIntegration(),
	//	new MonitorsMapIntegration()
	//);
	//const integrations: Array<SomeMapIntegration> = [
	//	new BaseLayerSeperator(),
	//	new WindMapIntegration(),
	//	new MonitorsMapIntegration()
	//];

	await monitors.init();

	onDestroy(() => {
		monitors.autoUpdate.stop();
	});
</script>

<main>
	<LoadingScreen />
	<Map />
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
