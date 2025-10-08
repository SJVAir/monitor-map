<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import "@maptiler/sdk/dist/maptiler-sdk.css";
	import { MonitorsController } from "$lib/monitors/monitors.svelte.ts";
	import { MapController } from "./map.svelte.ts";

	const map = new MapController();
	const monitors = new MonitorsController();
	let container: HTMLDivElement;

	$effect(() => {
		if (map.initialized) {
			map.map.setFilter("monitors", monitors.filters);
		}
	});
	onMount(async () => {
		await monitors.init();
		map.init(container);
	});

	onDestroy(() => map.remove());
</script>

<div bind:this={container} style="width: 100%; height: 100%;"></div>
