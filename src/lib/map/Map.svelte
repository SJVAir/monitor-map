<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import "@maptiler/sdk/dist/maptiler-sdk.css";
	import { MapController, type MapConfig } from "./map.svelte.ts";

	const { integrations }: Pick<MapConfig, "integrations"> = $props();

	const mapCtrl = new MapController();
	let container: HTMLDivElement;

	onMount(async () => {
		mapCtrl.init({
			container,
			integrations
		});
	});

	onDestroy(() => mapCtrl.remove());
</script>

<div bind:this={container} style="width: 100%; height: 100%;"></div>
