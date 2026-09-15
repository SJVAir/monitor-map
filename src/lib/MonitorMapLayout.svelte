<script lang="ts">
	import type { Snippet } from "svelte";
	import { onDestroy, untrack } from "svelte";
	import MapShell from "$lib/map/MapShell.svelte";
	import MonitorsDisplayOptions from "$lib/monitors/components/MonitorsDisplayOptions.svelte";
	import MapLayersDisplayOptions from "$lib/components/MapLayersDisplayOptions.svelte";
	import MapStyleDisplayOptions from "$lib/map/MapStyleDisplayOptions.svelte";
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
		// Read monitorsManager.pollutant via untrack: this effect must only react to the URL
		// changing (e.g. navigating in from elsewhere), not to monitorsManager.pollutant itself.
		// Tracking it here would make a UI-driven pollutant change (e.g. the display-options
		// toggle) re-trigger this effect before the manager->URL effect below can sync the URL,
		// so this effect would see the still-stale URL and immediately revert the user's change.
		if (
			monitorsManager.initialized &&
			(urlPollutant === "pm25" || urlPollutant === "o3") &&
			untrack(() => monitorsManager.pollutant) !== urlPollutant
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

	// Clear selected icon scale when the detail panel closes
	$effect(() => {
		if (panelOpen) return;
		monitorsMapIntegration.selectedMonitorId = null;
	});

	onDestroy(() => {
		monitorsManager.autoUpdate.stop();
	});
</script>

<MapShell
	{integrations}
	ready={monitorsManager.initialized}
	{panelOpen}
	knownRoutes={[`${basePath}/monitor/`]}
	{basePath}
>
	{#snippet menu()}
		<MonitorsDisplayOptions />
		<EvStationsDisplayOptions />
		<MapLayersDisplayOptions />
		<MapStyleDisplayOptions />
	{/snippet}
	{#snippet overlays()}
		<div class="pointer-events-none absolute bottom-0 left-0 z-10">
			<MapLegend />
		</div>
		<div class="absolute top-4 left-20 z-10">
			<Search />
		</div>
	{/snippet}
	{@render children()}
</MapShell>
