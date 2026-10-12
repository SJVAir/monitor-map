<script lang="ts">
	import type { Snippet } from "svelte";
	import { onDestroy, untrack } from "svelte";
	import { searchParams } from "sv-router";
	import MapShell from "$lib/map/MapShell.svelte";
	import OptionsGroup from "$lib/options/OptionsGroup.svelte";
	import PollutantMenu from "$lib/options/menus/PollutantMenu.svelte";
	import MonitorsMenu from "$lib/options/menus/MonitorsMenu.svelte";
	import LayersMenu from "$lib/options/menus/LayersMenu.svelte";
	import OverlaysMenu from "$lib/options/menus/OverlaysMenu.svelte";
	import SettingsMenu from "$lib/options/menus/SettingsMenu.svelte";
	import {
		applyPollutantSelection,
		currentSelection,
		parsePollutantParam
	} from "$lib/options/pollutant-param";
	import Legend from "$lib/legend/Legend.svelte";
	import {
		fireSmokeLegendSections,
		pollutantLegendSection,
		type LegendSection
	} from "$lib/legend/legend-data";
	import { monitorsManager } from "$lib/monitors/monitors.svelte";
	import { monitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte";
	import { windMapIntegration } from "$lib/wind/wind.svelte";
	import { baseLayerSeperator } from "$lib/map/integrations/base-layer-seperator";
	import type { SomeMapIntegration } from "$lib/map/integrations/types";
	import { collocationSitesManager } from "$lib/collocation-sites/collocations.svelte";
	import { collocationSitesMapIntegration } from "$lib/collocation-sites/collocations-map-integration.svelte";
	import { evStationsMapIntegration } from "$lib/ev-stations/ev-stations-map-integration.svelte";
	import { hmsManager } from "$lib/hms/hms.svelte";
	import { hmsFireMapIntegration } from "$lib/hms/hms-fire-map-integration.svelte";
	import { FIRE_LEGEND_CATEGORIES } from "$lib/hms/hms-fire-icon-manager";
	import { hmsSmokeMapIntegration, SMOKE_LEGEND } from "$lib/hms/hms-smoke-map-integration.svelte";
	import Search from "$lib/search/Search.svelte";
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

	const pollutantTargets = { manager: monitorsManager, integration: monitorsMapIntegration };

	// "?pollutant=none" must disable monitors before the effects below first run, so the
	// state->URL effect never sees enabled monitors and overwrites the param.
	if (parsePollutantParam(route.search.pollutant) === "none") {
		monitorsMapIntegration.enabled = false;
	}

	// The load screen stays up until the monitors load, so a failure has to be shown on it.
	let loadFailed = $state(false);

	function loadMonitors() {
		loadFailed = false;
		// A rejected init() can be retried: a later call starts a fresh run.
		monitorsManager.init(route.search.pollutant).catch((error) => {
			console.error(error);
			loadFailed = true;
		});
	}

	loadMonitors();
	// A previous instance of this layout stopped polling in onDestroy; init() is a no-op by now.
	monitorsManager.resumeAutoUpdate();
	collocationSitesManager.init();
	hmsManager.init();
	monitorsMapIntegration.onMonitorClick = (id: string) => {
		navigate(`${basePath}/monitor/:id`, { params: { id } }).catch(console.error);
	};

	let panelOpen = $derived(route.pathname.startsWith(`${basePath}/monitor/`));

	// Keep the Pollutant menu's selection (pm25 / o3 / none) and the "pollutant" URL param in
	// sync, both directions. init() only seeds the pollutant on the manager's first-ever
	// initialization; this effect applies a later "?pollutant=" change (e.g. navigating in from
	// elsewhere) to an already-running map.
	$effect(() => {
		const selection = parsePollutantParam(route.search.pollutant);
		if (!monitorsManager.initialized || !selection) return;
		// Read current state via untrack: this effect must only react to the URL changing. Tracking
		// state here would make a UI-driven change re-trigger this effect before the effect below
		// syncs the URL, so it would see the stale URL and revert the user's change.
		untrack(() => {
			if (
				currentSelection(monitorsManager.pollutant, monitorsMapIntegration.enabled) !== selection
			) {
				applyPollutantSelection(selection, pollutantTargets);
			}
		});
	});

	// ...and the reverse: reflect UI-driven changes back to the URL.
	$effect(() => {
		const selection = currentSelection(monitorsManager.pollutant, monitorsMapIntegration.enabled);
		if (selection && searchParams.get("pollutant") !== selection) {
			searchParams.set("pollutant", selection);
		}
	});

	// Clear selected icon scale when the detail panel closes
	$effect(() => {
		if (panelOpen) return;
		monitorsMapIntegration.selectedMonitorId = null;
	});

	const legendSections: Array<LegendSection> = $derived.by(() => {
		const sections: Array<LegendSection> = [];
		if (monitorsMapIntegration.enabled && monitorsManager.pollutant && monitorsManager.levels) {
			const pollutant = pollutantLegendSection(monitorsManager.pollutant, monitorsManager.levels);
			if (pollutant) sections.push(pollutant);
		}
		if (hmsFireMapIntegration.enabled && hmsSmokeMapIntegration.enabled) {
			sections.push(...fireSmokeLegendSections(FIRE_LEGEND_CATEGORIES, SMOKE_LEGEND));
		}
		return sections;
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
	{#snippet loadError()}
		{#if loadFailed}
			<div class="flex flex-col items-center gap-3 px-4 text-center" role="alert">
				<p class="text-gray-700">Couldn't load air monitors.</p>
				<button
					type="button"
					class="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
					onclick={loadMonitors}
				>
					Try again
				</button>
			</div>
		{/if}
	{/snippet}
	{#snippet menu()}
		<OptionsGroup>
			<PollutantMenu />
			<MonitorsMenu />
		</OptionsGroup>
		<OptionsGroup>
			<LayersMenu />
			<OverlaysMenu />
			<SettingsMenu />
		</OptionsGroup>
	{/snippet}
	{#snippet search()}
		<Search />
	{/snippet}
	{#snippet overlays()}
		<div class="pointer-events-none absolute bottom-4 left-4 z-10">
			<Legend sections={legendSections} />
		</div>
	{/snippet}
	{@render children()}
</MapShell>
