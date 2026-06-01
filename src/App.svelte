<script lang="ts">
	import "./app.css";
	import { onDestroy } from "svelte";
	import { Router } from "sv-router";
	import { navigate, route } from "./router";
	import LoadScreen, { disable as disableLoadScreen } from "$lib/LoadScreen.svelte";
	import Map from "$lib/map/Map.svelte";
	import Menu from "$lib/map/Menu.svelte";
	import MonitorsDisplayOptions from "$lib/monitors/components/MonitorsDisplayOptions.svelte";
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
	import EvStationsDisplayOptions from "$lib/ev-stations/components/EvStationsDisplayOptions.svelte";
	import { evStationsMapIntegration } from "$lib/ev-stations/ev-stations-map-integration.svelte.ts";
	import { hmsManager } from "$lib/hms/hms.svelte.ts";
	import { hmsFireMapIntegration } from "$lib/hms/hms-fire-map-integration.svelte.ts";
	import { hmsSmokeMapIntegration } from "$lib/hms/hms-smoke-map-integration.svelte.ts";
	import MonitorMarkersLegend from "$lib/monitors/components/MonitorMarkersLegend.svelte";

	const TRANSITION_MS = 300;

	const integrations: Array<SomeMapIntegration> = [
		baseLayerSeperator,
		collocationSitesMapIntegration,
		windMapIntegration,
		hmsSmokeMapIntegration,
		hmsFireMapIntegration,
		monitorsMapIntegration,
		evStationsMapIntegration
	];

	monitorsManager.init();
	collocationSitesManager.init();
	hmsManager.init();
	monitorsMapIntegration.onMonitorClick = (id: string) => {
		navigate("/monitor/:id", { params: { id } }).catch(console.error);
	};

	let panelOpen = $derived(route.pathname.startsWith("/monitor/"));

	$effect(() => {
		if (mapManager.map && monitorsManager.initialized) {
			mapManager.map.once("idle", () => disableLoadScreen());
		}
	});

	$effect(() => {
		if (panelOpen) {
			// Container width snapped to open; resize after layout settles
			requestAnimationFrame(() => mapManager.map?.resize());
		} else {
			// Container width snaps back after the transform transition ends
			setTimeout(() => mapManager.map?.resize(), TRANSITION_MS);
		}
	});

	// Clear selected icon scale when the detail panel closes
	$effect(() => {
		if (panelOpen) return;
		monitorsMapIntegration.selectedMonitorId = null;
	});

	onDestroy(() => {
		monitorsManager.autoUpdate.stop();
	});
</script>

<div class="shell" class:panel-open={panelOpen}>
	<LoadScreen />
	<div class="relative flex-1 overflow-hidden">
		<Map {integrations} />
		<div class="z-10 absolute bottom-6 left-6 w-1/2 lg:w-1/5">
			<MonitorMarkersLegend />
		</div>
		<div class="absolute top-0 left-0 z-10 m-4">
			<Menu>
				<MonitorsDisplayOptions />
				<EvStationsDisplayOptions />
				<MapLayersDisplayOptions />
				<MapStyleDisplayOptions />
			</Menu>
		</div>
	</div>
	<div class="panel-container">
		<div class="panel-content">
			<Router />
		</div>
	</div>
</div>

<style>
	.shell {
		display: flex;
		position: relative;
		width: 100%;
		height: 100%;
	}

	.panel-container {
		flex-shrink: 0;
		overflow: hidden;
		width: 0;
	}

	.shell.panel-open .panel-container {
		width: 33.333vw;
	}

	.panel-content {
		width: 33.333vw;
		height: 100%;
		transform: translateX(100%);
		transition: transform 300ms ease-in-out;
	}

	.shell.panel-open .panel-content {
		transform: translateX(0);
	}

	@media (max-width: 768px) {
		.shell {
			flex-direction: column;
		}

		.panel-container {
			width: 100vw;
			height: 0;
		}

		.shell.panel-open .panel-container {
			width: 100vw;
			height: 50vh;
		}

		.panel-content {
			width: 100vw;
			height: 50vh;
			transform: translateY(100%);
		}

		.shell.panel-open .panel-content {
			transform: translateY(0);
		}
	}
</style>
