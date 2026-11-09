<script lang="ts">
	import type { Snippet } from "svelte";
	import { onDestroy, onMount, untrack } from "svelte";
	import { searchParams } from "sv-router";
	import {
		collocationSitesPlugin,
		hmsFirePlugin,
		hmsSmokePlugin,
		monitorsPlugin
	} from "@sjvair/map-sdk";
	import { windPlugin } from "$lib/wind/wind-plugin.js";
	import { evPlugin } from "$lib/ev-stations/ev-plugin.svelte.js";
	import { createEvStore } from "$lib/ev-stations/ev-store.svelte.js";
	import { stationPopups } from "$lib/ev-stations/station-popup.svelte.js";
	import MapShell from "$lib/map/MapShell.svelte";
	import { createLiveMap } from "$lib/map/live-map.svelte.js";
	import { syncPlugins } from "$lib/map/sync-plugins.svelte.js";
	import LoadError from "$lib/LoadError.svelte";
	import { retryMonitorsLoad } from "$lib/monitors/retry-load.js";
	import { monitorsManager } from "$lib/monitors/monitors.svelte.js";
	import { filteredMonitors } from "$lib/monitors/filtered-source.svelte.js";
	import Legend from "$lib/legend/Legend.svelte";
	import {
		collocationSitesStore,
		hmsFireStore,
		hmsSmokeStore,
		monitorsStore
	} from "$lib/stores.svelte.js";
	import OptionsGroup from "$lib/options/OptionsGroup.svelte";
	import PollutantMenu from "$lib/options/menus/PollutantMenu.svelte";
	import MonitorsMenu from "$lib/options/menus/MonitorsMenu.svelte";
	import LayersMenu from "$lib/options/menus/LayersMenu.svelte";
	import OverlaysMenu from "$lib/options/menus/OverlaysMenu.svelte";
	import SettingsMenu from "$lib/options/menus/SettingsMenu.svelte";
	import { mapOptions } from "$lib/options/map-options.svelte.js";
	import { wantedPlugins } from "$lib/options/plugin-order";
	import {
		applyPollutantSelection,
		currentSelection,
		parsePollutantParam
	} from "$lib/options/pollutant-param";
	import Search from "$lib/search/Search.svelte";
	import { useMonitorMapRouter } from "./router-context";

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const { route, navigate, basePath } = useMonitorMapRouter();

	// The map's state lives as long as this layout; MapView attaches the GL map when it mounts.
	const map = createLiveMap();

	// "?pollutant=none" must turn monitors off before the effects below first run, so the
	// state->URL effect never sees monitors on and overwrites the param.
	if (parsePollutantParam(route.search.pollutant) === "none") {
		mapOptions.monitorsOn = false;
	}

	// The load screen stays up until the monitors load, so a failure has to be shown on it.
	const loadFailed = $derived(monitorsStore.dataSource.status.state === "error");

	function loadMonitors() {
		// A rejected init() can be retried: a later call starts a fresh run.
		monitorsManager.init(route.search.pollutant).catch((error) => console.error(error));
	}

	loadMonitors();

	const panelOpen = $derived(route.pathname.startsWith(`${basePath}/monitor/`));
	const selectedId = $derived(panelOpen ? route.params.id : undefined);

	// The monitors the Monitors menu's filters let through; clusters are built from these.
	const monitorsSource = filteredMonitors(monitorsStore.dataSource, mapOptions);

	// EV chargers: each level is fetched the first time it is wanted. A failure shows in the legend
	// with a retry.
	const evStore = createEvStore();
	const evPopups = stationPopups(map);
	$effect(() => {
		const wanted = wantedPlugins(mapOptions, monitorsManager.pollutant);
		for (const [key, level] of [
			["ev-l2", "lvl2"],
			["ev-l3", "lvl3"]
		] as const) {
			if (wanted.has(key)) untrack(() => evStore.load(level)).catch(console.error);
		}
	});

	// The options decide which plugins are on the map, in DRAW_ORDER. `clustered` is fixed when a
	// plugin is built, so a change rebuilds it.
	syncPlugins(
		map,
		() => wantedPlugins(mapOptions, monitorsManager.pollutant),
		{
			monitors: () => ({
				plugin: monitorsPlugin({
					id: "monitors",
					source: monitorsSource,
					layerLabel: "Monitors",
					selectable: true,
					selectedStyle: "enlarge",
					clustered: mapOptions.clustered
				}),
				// A removed plugin forgets its mode and selection, so each add passes them again.
				options: {
					selectionMode: "single",
					selection: selectedId ? { kind: "monitors", ids: [selectedId] } : null
				}
			}),
			"ev-l2": () =>
				evPlugin("lvl2", evStore.dataSource("lvl2"), { clustered: mapOptions.clustered }),
			"ev-l3": () =>
				evPlugin("lvl3", evStore.dataSource("lvl3"), { clustered: mapOptions.clustered })
		},
		() => mapOptions.clustered
	);

	// Wind, Fire & Smoke and collocation sites take no build-time option, so they sit in their own call
	// without `deps`: a Marker Clusters change rebuilds only the monitors above. DRAW_ORDER still
	// holds across the two calls because `syncPlugins` reads `map.plugins` (every plugin on the
	// map, whichever call added it) to find the plugin to add before.
	syncPlugins(map, () => wantedPlugins(mapOptions, monitorsManager.pollutant), {
		wind: () => windPlugin(),
		"hms-smoke": () =>
			hmsSmokePlugin({
				id: "hms-smoke",
				source: hmsSmokeStore.dataSource,
				layerLabel: "Smoke"
			}),
		"hms-fire": () =>
			hmsFirePlugin({
				id: "hms-fire",
				source: hmsFireStore.groups,
				hotspots: hmsFireStore.hotspots,
				layerLabel: "Fires"
			}),
		"collocation-sites": () =>
			collocationSitesPlugin({
				id: "collocation-sites",
				source: collocationSitesStore.dataSource,
				layerLabel: "Collocation sites"
			})
	});

	// Keep the Pollutant menu's selection (pm25 / o3 / none) and the "pollutant" URL param in
	// sync, both directions. init() only seeds the pollutant on the store's first-ever
	// initialization; this effect applies a later "?pollutant=" change (e.g. navigating in from
	// elsewhere, or back/forward) to an already-running map.
	$effect(() => {
		const selection = parsePollutantParam(route.search.pollutant);
		if (!monitorsManager.initialized || !selection) return;
		// Read current state via untrack: this effect must only react to the URL changing. Tracking
		// state here would make a UI-driven change re-trigger this effect before the effect below
		// syncs the URL, so it would see the stale URL and revert the user's change.
		untrack(() => {
			if (currentSelection(monitorsManager.pollutant, mapOptions.monitorsOn) !== selection) {
				applyPollutantSelection(selection, { manager: monitorsManager, options: mapOptions });
			}
		});
	});

	// ...and the reverse: reflect UI-driven changes back to the URL.
	$effect(() => {
		const selection = currentSelection(monitorsManager.pollutant, mapOptions.monitorsOn);
		if (selection && searchParams.get("pollutant") !== selection) {
			searchParams.set("pollutant", selection);
		}
	});

	onMount(() => {
		// A failed load leaves its layer empty (map-sdk's legend shows the status); log it once.
		for (const store of [hmsSmokeStore, hmsFireStore, collocationSitesStore]) {
			store.init().catch(console.error);
		}
		// A previous instance of this layout paused polling in onDestroy; init() is a no-op by now.
		monitorsManager.resumeAutoUpdate();
		return map.on("featureclick", ({ pluginId, ref, lngLat }) => {
			// A station clicked on the map or picked from the list: its popup.
			if ((pluginId === "ev-l2" || pluginId === "ev-l3") && ref.kind === "feature") {
				const station = evStore.station(ref.id);
				if (station) evPopups.open(pluginId, station, lngLat);
				return;
			}
			if (pluginId !== "monitors" || ref.kind !== "monitor") return;
			navigate(`${basePath}/monitor/:id`, { params: { id: ref.id } }).catch(console.error);
			map.easeTo({ center: lngLat, minZoom: 12 });
		});
	});

	// The selected monitor follows the route: the open panel's monitor, none once it closes.
	$effect(() => {
		const id = selectedId;
		map.setSelection("monitors", id ? { kind: "monitors", ids: [id] } : null);
	});

	onDestroy(() => {
		monitorsManager.pauseAutoUpdate();
		map.destroy();
	});
</script>

<MapShell
	{map}
	ready={monitorsManager.initialized}
	{panelOpen}
	knownRoutes={[`${basePath}/monitor/`]}
	{basePath}
>
	{#snippet loadError()}
		{#if loadFailed}
			<LoadError
				message="Couldn't load air monitors."
				onretry={() => retryMonitorsLoad(monitorsStore, loadMonitors)}
			/>
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
			<SettingsMenu {map} />
		</OptionsGroup>
	{/snippet}
	{#snippet overlays()}
		<div class="pointer-events-none absolute bottom-4 left-4 z-10">
			<Legend {map} {panelOpen} />
		</div>
	{/snippet}
	{#snippet search()}
		<Search {map} />
	{/snippet}
	{@render children()}
</MapShell>
