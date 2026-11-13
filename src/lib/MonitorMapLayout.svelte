<script lang="ts">
	import type { Snippet } from "svelte";
	import { onDestroy, onMount, untrack } from "svelte";
	import { searchParams } from "sv-router";
	import {
		BanIcon,
		ContrastIcon,
		CrosshairIcon,
		EvChargerIcon,
		FlameIcon,
		LayersIcon,
		MapIcon,
		NetworkIcon,
		RadioTowerIcon,
		RotateCcwIcon,
		SettingsIcon,
		SquareStackIcon,
		WindIcon
	} from "@lucide/svelte";
	import {
		collocationSitesPlugin,
		hmsFirePlugin,
		hmsOptions,
		hmsSmokePlugin,
		monitorsOptions,
		monitorsPlugin,
		OptionsToolbar,
		settingsGroup,
		type OptionValues
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
	import {
		applyOptionChange,
		bindBasemap,
		initMapOptions,
		mapOptions,
		monitorsDisplay,
		toolbarValues
	} from "$lib/options/option-values.svelte.js";
	import { buildToolbar, type ToolbarIcons } from "$lib/options/toolbar-groups";
	import { ROW_ICONS } from "$lib/options/row-icons";
	import pm25Icon from "$lib/assets/icons/pm25/pm25-02-particle-field.svg";
	import ozoneIcon from "$lib/assets/icons/ozone/ozone-08-sunrise-haze.svg";
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

	// The toolbar's icons: the snippets below, and the EV level markers' SVG.
	const icons: ToolbarIcons = {
		monitors: monitorsIcon,
		pm25: pm25Image,
		o3: ozoneImage,
		none: noneIcon,
		collocation: collocationIcon,
		layers: layersIcon,
		fireAndSmoke: fireAndSmokeIcon,
		evStations: evStationsIcon,
		overlays: overlaysIcon,
		wind: windIcon,
		settings: settingsIcon,
		clusters: clustersIcon,
		basemap: basemapIcon,
		theme: themeIcon,
		reset: resetIcon,
		evLevel2: { svg: ROW_ICONS.evLevel2 },
		evLevel3: { svg: ROW_ICONS.evLevel3 }
	};

	// Once per map: it keeps what the metadata answers. The groups follow the metadata, the
	// pollutant and the basemap the map draws, so they're rebuilt in a $derived.
	const monitorsPreset = monitorsOptions(map);
	const toolbarPreset = $derived(
		buildToolbar({
			monitors: monitorsPreset,
			settings: settingsGroup(map, {
				icon: icons.settings,
				clusters: { icon: icons.clusters },
				basemap: { icons: { basemap: icons.basemap, theme: icons.theme } },
				reset: { icon: icons.reset }
			}),
			hms: hmsOptions(map, { icon: icons.fireAndSmoke }),
			meta: monitorsManager.meta,
			selection: currentSelection(monitorsManager.pollutant, monitorsDisplay.monitorsOn),
			layersLabel: map.messages("mapsdk_options_layers"),
			overlaysLabel: map.messages("mapsdk_options_overlays"),
			icons
		})
	);

	// Defaults that arrive later (a type key once the metadata loads) fill in; a value the user
	// already has, including one from before a remount, stays.
	$effect.pre(() => initMapOptions(toolbarPreset.defaults));

	// The pollutant shows the manager's; before it has one, the default's key.
	const toolbarOptionValues = $derived(
		toolbarValues(
			monitorsManager.pollutant,
			monitorsDisplay.monitorsOn,
			String(toolbarPreset.defaults.pollutant ?? "pm25")
		)
	);

	function onOptionsChange(next: OptionValues, changed: string[]) {
		applyOptionChange(next, changed, { manager: monitorsManager, basemap: map.basemap });
	}

	// "?pollutant=none" must turn monitors off before the effects below first run, so the
	// state->URL effect never sees monitors on and overwrites the param.
	if (parsePollutantParam(route.search.pollutant) === "none") {
		monitorsDisplay.monitorsOn = false;
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

	// The monitors the toolbar's Monitors rows let through; clusters are built from these.
	const monitorsSource = filteredMonitors(monitorsStore.dataSource, mapOptions);

	// EV chargers: each level is fetched the first time it is wanted. A failure shows in the legend
	// with a retry.
	const evStore = createEvStore();
	const evPopups = stationPopups(map);
	$effect(() => {
		const wanted = wantedPlugins(mapOptions, monitorsDisplay.monitorsOn, monitorsManager.pollutant);
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
		() => wantedPlugins(mapOptions, monitorsDisplay.monitorsOn, monitorsManager.pollutant),
		{
			monitors: () => ({
				plugin: monitorsPlugin({
					id: "monitors",
					source: monitorsSource,
					layerLabel: "Monitors",
					selectable: true,
					selectedStyle: "enlarge",
					clustered: mapOptions.clustered === true
				}),
				// A removed plugin forgets its mode and selection, so each add passes them again.
				options: {
					selectionMode: "single",
					selection: selectedId ? { kind: "monitors", ids: [selectedId] } : null
				}
			}),
			"ev-l2": () =>
				evPlugin("lvl2", evStore.dataSource("lvl2"), { clustered: mapOptions.clustered === true }),
			"ev-l3": () =>
				evPlugin("lvl3", evStore.dataSource("lvl3"), { clustered: mapOptions.clustered === true })
		},
		() => mapOptions.clustered === true
	);

	// Wind, Fire & Smoke and collocation sites take no build-time option, so they sit in their own call
	// without `deps`: a Marker Clusters change rebuilds only the monitors above. DRAW_ORDER still
	// holds across the two calls because `syncPlugins` reads `map.plugins` (every plugin on the
	// map, whichever call added it) to find the plugin to add before.
	syncPlugins(
		map,
		() => wantedPlugins(mapOptions, monitorsDisplay.monitorsOn, monitorsManager.pollutant),
		{
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
		}
	);

	// Keep the toolbar's pollutant (pm25 / o3 / none) and the "pollutant" URL param in
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
			if (currentSelection(monitorsManager.pollutant, monitorsDisplay.monitorsOn) !== selection) {
				applyPollutantSelection(selection, { manager: monitorsManager, options: monitorsDisplay });
			}
		});
	});

	// ...and the reverse: reflect UI-driven changes back to the URL.
	$effect(() => {
		const selection = currentSelection(monitorsManager.pollutant, monitorsDisplay.monitorsOn);
		if (selection && searchParams.get("pollutant") !== selection) {
			searchParams.set("pollutant", selection);
		}
	});

	onMount(() => {
		// Each mount opens on the default basemap; a basemap that fails to load reverts the value.
		const unbindBasemap = bindBasemap(map.basemap);
		// A failed load leaves its layer empty (map-sdk's legend shows the status); log it once.
		for (const store of [hmsSmokeStore, hmsFireStore, collocationSitesStore]) {
			store.init().catch(console.error);
		}
		// A previous instance of this layout paused polling in onDestroy; init() is a no-op by now.
		monitorsManager.resumeAutoUpdate();
		const offFeatureClick = map.on("featureclick", ({ pluginId, ref, lngLat }) => {
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
		return () => {
			offFeatureClick();
			unbindBasemap();
		};
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
	{#snippet toolbar()}
		<OptionsToolbar
			{map}
			groups={toolbarPreset.groups}
			values={toolbarOptionValues}
			onchange={onOptionsChange}
			defaults={toolbarPreset.defaults}
			basemapKey="basemap"
		>
			{#snippet search()}
				<Search {map} />
			{/snippet}
		</OptionsToolbar>
	{/snippet}
	{#snippet overlays()}
		<!-- From below the options toolbar to the bottom, so the legend never covers it. -->
		<div
			class="pointer-events-none absolute top-18 bottom-4 left-4 z-10 flex flex-col justify-end md:top-32"
		>
			<Legend {map} {panelOpen} />
		</div>
	{/snippet}
	{@render children()}
</MapShell>

{#snippet monitorsIcon()}<RadioTowerIcon size={20} color="#4682b4" />{/snippet}
{#snippet pm25Image()}<img src={pm25Icon} alt="" width="20" height="20" />{/snippet}
{#snippet ozoneImage()}<img src={ozoneIcon} alt="" width="20" height="20" />{/snippet}
{#snippet noneIcon()}<BanIcon size={18} color="#778899" />{/snippet}
{#snippet collocationIcon()}<CrosshairIcon size={16} color="#4A5FC6" />{/snippet}
{#snippet layersIcon()}<LayersIcon size={20} color="#708090" />{/snippet}
{#snippet fireAndSmokeIcon()}<FlameIcon size={18} color="#ff4500" />{/snippet}
{#snippet evStationsIcon()}<EvChargerIcon size={18} color="#708090" />{/snippet}
{#snippet overlaysIcon()}<SquareStackIcon size={20} color="#708090" />{/snippet}
{#snippet windIcon()}<WindIcon size={18} color="#1e90ff" />{/snippet}
{#snippet settingsIcon()}<SettingsIcon size={20} color="#696969" />{/snippet}
{#snippet clustersIcon()}<NetworkIcon size={18} color="#1e90ff" />{/snippet}
{#snippet basemapIcon()}<MapIcon size={18} color="#708090" />{/snippet}
{#snippet themeIcon()}<ContrastIcon size={18} color="#708090" />{/snippet}
{#snippet resetIcon()}<RotateCcwIcon size={16} />{/snippet}
