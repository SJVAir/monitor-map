<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import "@maptiler/sdk/dist/maptiler-sdk.css";
	import { MonitorsController } from "$lib/monitors/monitors.svelte.ts";
	import { MapController } from "./map.svelte.ts";
	import type { GeoJSONSource } from "@maptiler/sdk";

	const mapCtrl = new MapController();
	const monitors = new MonitorsController();
	let container: HTMLDivElement;

	$effect(() => {
		if (mapCtrl.initialized) {
			for (const integration of mapCtrl.integrations) {
				const source = mapCtrl.map.getSource(integration.referenceId);
				if (source && source.type === "geojson") {
					console.log("calling update from effect", integration.mapSource[1]);
					(source as GeoJSONSource).setData(integration.features);
				}
				if (integration.filters) {
					mapCtrl.map.setFilter(integration.referenceId, integration.filters);
				}
			}
		}
	});
	onMount(async () => {
		await monitors.init();
		mapCtrl.init(container);
	});

	onDestroy(() => mapCtrl.remove());
</script>

<div bind:this={container} style="width: 100%; height: 100%;"></div>
