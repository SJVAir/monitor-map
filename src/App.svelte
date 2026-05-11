<script lang="ts">
	import "./app.css";
	import { onDestroy } from "svelte";
	import { Router } from "sv-router";
	import { route } from "./router";
	import LoadScreen, { disable as disableLoadScreen } from "$lib/LoadScreen.svelte";
	import Map from "$lib/map/Map.svelte";
	import Menu from "$lib/map/Menu.svelte";
	import MonitorsDisplayOptions from "$lib/monitors/MonitorsDisplayOptions.svelte";
	import MapLayersDisplayOptions from "$lib/components/MapLayersDisplayOptions.svelte";
	import MapStyleDisplayOptions from "$lib/map/MapStyleDisplayOptions.svelte";
	import { mapManager } from "$lib/map/map.svelte";
	import { monitorsManager } from "$lib/monitors/monitors.svelte";
	import { monitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte.ts";
	import { windMapIntegration } from "$lib/wind/wind.svelte";
	import { baseLayerSeperator } from "$lib/map/integrations/base-layer-seperator";
	import type { SomeMapIntegration } from "$lib/map/integrations/types";
	import { collocationSitesManager } from "$lib/collocation-sites/collocations.svelte";
	import { collocationSitesMapIntegration } from "$lib/collocation-sites/collocations-map-integration.svelte";

	const TRANSITION_MS = 300;

	const integrations: Array<SomeMapIntegration> = [
		baseLayerSeperator,
		collocationSitesMapIntegration,
		windMapIntegration,
		monitorsMapIntegration
	];

	monitorsManager.init();
	collocationSitesManager.init();

	let panelOpen = $derived(route.pathname.startsWith("/monitor/"));

	// Svelte's class: directive cannot handle Tailwind arbitrary-value classes
	// containing brackets or colons, so the responsive grid classes are computed here.
	// Desktop (md+): transitions grid-template-columns — closed: 1fr 0fr, open: 2fr 1fr
	// Mobile (<md):  transitions grid-template-rows   — closed: 1fr 0fr, open: 1fr 1fr
	let shellClass = $derived(
		[
			"grid w-screen h-screen",
			"transition-[grid-template-columns,grid-template-rows] duration-300 ease-in-out",
			panelOpen
				? "grid-cols-[2fr_1fr] max-md:grid-cols-[1fr] max-md:grid-rows-[1fr_1fr]"
				: "grid-cols-[1fr_0fr] max-md:grid-cols-[1fr] max-md:grid-rows-[1fr_0fr]"
		].join(" ")
	);

	$effect(() => {
		if (mapManager.map && monitorsManager.initialized) {
			mapManager.map.once("idle", () => disableLoadScreen());
		}
	});

	$effect(() => {
		// Track panelOpen reactively; resize map after the CSS transition settles
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		panelOpen;
		setTimeout(() => mapManager.map?.resize(), TRANSITION_MS);
	});

	onDestroy(() => {
		monitorsManager.autoUpdate.stop();
	});
</script>

<div class={shellClass}>
	<LoadScreen />
	<div class="relative overflow-hidden">
		<Map {integrations} />
		<div class="absolute top-0 left-0 z-10 m-4">
			<Menu>
				<MonitorsDisplayOptions />
				<MapLayersDisplayOptions />
				<MapStyleDisplayOptions />
			</Menu>
		</div>
	</div>
	<div class="overflow-hidden">
		<Router />
	</div>
</div>
