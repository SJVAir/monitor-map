<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import type { GeoJSONSource } from "@maptiler/sdk";
	import "@maptiler/sdk/dist/maptiler-sdk.css";
	import { MapGeoJSONIntegration } from "./integrations.svelte.ts";
	import { MapController, type MapConfig } from "./map.svelte.ts";

	const { integrations }: Pick<MapConfig, "integrations"> = $props();

	const mapCtrl = new MapController();
	let container: HTMLDivElement;

	onMount(async () => {
		mapCtrl.init({
			container,
			integrations
		});
		setTimeout(async () => {
			await mapCtrl.updateMapStyle("OPENSTREETMAP");
		}, 1000 * 8);
	});

	onDestroy(() => mapCtrl.remove());
</script>

<div bind:this={container} style="width: 100%; height: 100%;"></div>
