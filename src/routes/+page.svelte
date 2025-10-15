<script lang="ts">
	import { onDestroy } from "svelte";
	import Map from "$lib/map/Map.svelte";
	import Menu from "$lib/map/Menu.svelte";
	import LoadingScreen from "$lib/loading/screen/LoadScreen.svelte";
	import MonitorsDisplayOptions from "$lib/monitors/MonitorsDisplayOptions.svelte";
	import WindDisplayOptions from "$lib/wind/WindDisplayOptions.svelte";
	import { MonitorsController } from "$lib/monitors/monitors.svelte";
	import { MonitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte.ts";
	import { WindMapIntegration } from "$lib/wind/wind.svelte";

	const monitors = new MonitorsController();
	const integrations = [new WindMapIntegration(), new MonitorsMapIntegration()];

	await monitors.init();

	onDestroy(() => {
		monitors.autoUpdate.stop();
	});
</script>

<main>
	<LoadingScreen />
	<Map {integrations} />
	<div class="absolute top-0 left-0 z-10 m-4">
		<Menu>
			<MonitorsDisplayOptions />
			<WindDisplayOptions />
		</Menu>
	</div>
</main>

<style>
	main {
		width: 100vw;
		height: 100vh;
	}
</style>
