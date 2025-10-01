<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import "@maptiler/sdk/dist/maptiler-sdk.css";
	import { MapController } from "./map";

	const map = new MapController();
	let container: HTMLDivElement;

	onMount(() => {
		map.init(container);
	});

	onDestroy(() => map.remove());
</script>

<div bind:this={container} style="width: 100%; height: 100%;"></div>

<style>
	div {
		background: url(/stars_milky_way_space.jpg);
	}
</style>
