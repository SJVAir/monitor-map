<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import type { GeoJSONSource } from "@maptiler/sdk";
	import "@maptiler/sdk/dist/maptiler-sdk.css";
	import { MapGeoJSONIntegration } from "./integrations.svelte.ts";
	import { MapController, type MapConfig } from "./map.svelte.ts";

	const { integrations }: Pick<MapConfig, "integrations"> = $props();

	const mapCtrl = new MapController();
	let container: HTMLDivElement;

	$effect(() => {
		if (mapCtrl.initialized) {
			console.log("sources:", mapCtrl.map.getStyle().sources);
			for (const integration of mapCtrl.integrations) {
				const isVisible = mapCtrl.map.getLayoutProperty(integration.referenceId, "visibility");

				if (integration.enabled) {
					if (isVisible !== "visible") {
						mapCtrl.map.setLayoutProperty(integration.referenceId, "visibility", "visible");
					}
				} else {
					if (isVisible === "visible") {
						mapCtrl.map.setLayoutProperty(integration.referenceId, "visibility", "none");
					}
				}

				if (integration instanceof MapGeoJSONIntegration) {
					console.log("checking integration:", integration);
					const source = mapCtrl.map.getSource(integration.referenceId) as GeoJSONSource;
					console.log("source found:", source);

					if (integration.mapSource.type === "geojson") {
						console.log("should update data");
						source.setData(integration.mapSource.data);
					}

					if (integration.filters) {
						mapCtrl.map.setFilter(integration.referenceId, integration.filters);
					}
				}
			}
		}
	});

	onMount(async () => {
		console.log("initializing map");
		mapCtrl.init({
			container,
			integrations
		});
	});

	onDestroy(() => mapCtrl.remove());
</script>

<div bind:this={container} style="width: 100%; height: 100%;"></div>
