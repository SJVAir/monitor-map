<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { config, Map, MapStyle } from "@maptiler/sdk";
	import "@maptiler/sdk/dist/maptiler-sdk.css";

	config.apiKey = import.meta.env.VITE_MAPTILER_KEY;

	let map: Map;
	let container: HTMLDivElement;

	onMount(() => {
		map = new Map({
			container: container,
			style: MapStyle.STREETS
		});
	});

	onDestroy(() => map?.remove());
</script>

<div bind:this={container} style="width: 100%; height: 100%;"></div>

<style>
	/* your styles go here */
</style>
