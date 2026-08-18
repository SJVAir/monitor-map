<script lang="ts">
	import type { Snippet } from "svelte";
	import { onDestroy } from "svelte";
	import LoadScreen, { disable as disableLoadScreen } from "$lib/LoadScreen.svelte";
	import Map from "$lib/map/Map.svelte";
	import Menu from "$lib/map/Menu.svelte";
	import MonitorsDisplayOptions from "$lib/monitors/components/MonitorsDisplayOptions.svelte";
	import MapLayersDisplayOptions from "$lib/components/MapLayersDisplayOptions.svelte";
	import MapStyleDisplayOptions from "$lib/map/MapStyleDisplayOptions.svelte";
	import { mapManager } from "$lib/map/map.svelte";
	import { monitorsManager } from "$lib/monitors/monitors.svelte";
	import { monitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte";
	import { windMapIntegration } from "$lib/wind/wind.svelte";
	import { baseLayerSeperator } from "$lib/map/integrations/base-layer-seperator";
	import type { SomeMapIntegration } from "$lib/map/integrations/types";
	import { collocationSitesManager } from "$lib/collocation-sites/collocations.svelte";
	import { collocationSitesMapIntegration } from "$lib/collocation-sites/collocations-map-integration.svelte";
	import EvStationsDisplayOptions from "$lib/ev-stations/components/EvStationsDisplayOptions.svelte";
	import { evStationsMapIntegration } from "$lib/ev-stations/ev-stations-map-integration.svelte";
	import { hmsManager } from "$lib/hms/hms.svelte";
	import { hmsFireMapIntegration } from "$lib/hms/hms-fire-map-integration.svelte";
	import { hmsSmokeMapIntegration } from "$lib/hms/hms-smoke-map-integration.svelte";
	import MapLegend from "$lib/MapLegend.svelte";
	import Search from "$lib/search/Search.svelte";
	import { searchParams } from "sv-router";
	import { useMonitorMapRouter } from "./router-context";

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const { route, navigate, basePath } = useMonitorMapRouter();

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

	monitorsManager.init(route.search.pollutant);
	collocationSitesManager.init();
	hmsManager.init();
	monitorsMapIntegration.onMonitorClick = (id: string) => {
		navigate(`${basePath}/monitor/:id`, { params: { id } }).catch(console.error);
	};

	let panelOpen = $derived(route.pathname.startsWith(`${basePath}/monitor/`));

	// Keep monitorsManager.pollutant and the "pollutant" URL param in sync, both directions.
	// init() only seeds pollutant on the manager's first-ever initialization; this effect is what
	// applies a later "?pollutant=" change (e.g. navigating in from elsewhere) to an already-running manager.
	$effect(() => {
		const urlPollutant = route.search.pollutant;
		if (
			monitorsManager.initialized &&
			(urlPollutant === "pm25" || urlPollutant === "o3") &&
			monitorsManager.pollutant !== urlPollutant
		) {
			monitorsManager.pollutant = urlPollutant;
		}
	});

	// ...and the reverse: reflect UI-driven pollutant changes (e.g. the display-options toggle) back to the URL.
	$effect(() => {
		const pollutant = monitorsManager.pollutant;
		if (pollutant && searchParams.get("pollutant") !== pollutant) {
			searchParams.set("pollutant", pollutant);
		}
	});

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

	/**
	 * HACK: Fix for escaping sv-router and allowing navigation to other pages,
	 * as well as navigating back
	 */
	const rootPath = basePath || "/";
	const knownRoutes = [`${basePath}/monitor/`];

	window.addEventListener("pageshow", (e) => {
		if (e.persisted) window.location.reload();
	});

	document.addEventListener(
		"click",
		(e) => {
			const anchor = e
				.composedPath()
				.find((el) => el instanceof HTMLAnchorElement) as HTMLAnchorElement;
			if (!anchor) return;
			const { pathname } = new URL(anchor.href);
			const isKnown = pathname === rootPath || knownRoutes.some((r) => pathname.startsWith(r));
			if (!isKnown) {
				e.stopImmediatePropagation();
				window.location.href = anchor.href;
			}
		},
		{ capture: true }
	);
</script>

<!--
<div class="shell" class:panel-open={panelOpen}>
  -->
<div class="relative flex h-full w-full flex-col md:flex-row">
	<LoadScreen />
	<div class="relative flex-1 overflow-hidden">
		<Map {integrations} />
		<div class="pointer-events-none absolute bottom-0 left-0 z-10">
			<MapLegend />
		</div>
		<div class="absolute top-4 left-4 z-10">
			<div class="absolute z-10">
				<Menu>
					<MonitorsDisplayOptions />
					<EvStationsDisplayOptions />
					<MapLayersDisplayOptions />
					<MapStyleDisplayOptions />
				</Menu>
			</div>
			<div class="absolute left-16">
				<Search />
			</div>
		</div>
	</div>
	<div
		class={[
			"panel-containr w-full shrink-0 overflow-hidden",
			panelOpen ? "h-1/2 md:h-full md:w-1/3" : "md:w-0"
		]}
	>
		<div
			class={[
				"panel-contet h-full duration-300 ease-in-out",
				panelOpen
					? "translate-y-0 md:translate-x-0"
					: "translate-y-full md:translate-x-full md:translate-y-0"
			]}
		>
			{@render children()}
		</div>
	</div>
</div>
