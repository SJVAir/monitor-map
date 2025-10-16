<script lang="ts">
	import { onDestroy } from "svelte";
	import { MapStyle } from "@maptiler/sdk";
	import Map from "$lib/map/Map.svelte";
	import Menu from "$lib/map/Menu.svelte";
	import LoadingScreen from "$lib/loading/screen/LoadScreen.svelte";
	import { MapController } from "$lib/map/map.svelte.ts";
	import MonitorsDisplayOptions from "$lib/monitors/MonitorsDisplayOptions.svelte";
	import WindDisplayOptions from "$lib/wind/WindDisplayOptions.svelte";
	import { MonitorsController } from "$lib/monitors/monitors.svelte";
	import { MonitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte.ts";
	import { WindMapIntegration } from "$lib/wind/wind.svelte";

	const mc = new MapController();
	const monitors = new MonitorsController();
	const integrations = [new WindMapIntegration(), new MonitorsMapIntegration()];

	let mapStyle: keyof typeof MapStyle = $state("STREETS");

	$effect(() => {
		mc.updateMapStyle(mapStyle);
	});

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
			<div class="flex-col items-center justify-center">
				<p class="text-lg font-bold underline">Map Styles</p>
				<select
					id="myDropdown"
					name="selectedOption"
					bind:value={mapStyle}
					class="m-2 rounded border p-1"
				>
					{#each Object.keys(MapStyle) as label}
						<option value={label}>{label}</option>
					{/each}
				</select>
			</div>
		</Menu>
	</div>
</main>

<style>
	main {
		width: 100vw;
		height: 100vh;
	}
</style>
