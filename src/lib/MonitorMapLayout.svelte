<script lang="ts">
	import type { Snippet } from "svelte";
	import { onDestroy, onMount } from "svelte";
	import { monitorsPlugin } from "@sjvair/map-sdk";
	import MapShell from "$lib/map/MapShell.svelte";
	import { createLiveMap } from "$lib/map/live-map.svelte.js";
	import LoadError from "$lib/LoadError.svelte";
	import { monitorsManager } from "$lib/monitors/monitors.svelte.js";
	import { monitorsStore } from "$lib/stores.svelte.js";
	import Search from "$lib/search/Search.svelte";
	import { useMonitorMapRouter } from "./router-context";

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const { route, navigate, basePath } = useMonitorMapRouter();

	// The map's state lives as long as this layout; MapView attaches the GL map when it mounts.
	const map = createLiveMap();

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

	const panelOpen = $derived(route.pathname.startsWith(`${basePath}/monitor/`));
	const selectedId = $derived(panelOpen ? route.params.id : undefined);

	onMount(() => {
		map.addPlugin(
			monitorsPlugin({
				id: "monitors",
				source: monitorsStore.dataSource,
				layerLabel: "Monitors",
				selectable: true,
				selectedStyle: "enlarge"
			}),
			{ selectionMode: "single" }
		);
		// A previous instance of this layout paused polling in onDestroy; init() is a no-op by now.
		monitorsManager.resumeAutoUpdate();
		return map.on("featureclick", ({ pluginId, ref, lngLat }) => {
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
			<LoadError message="Couldn't load air monitors." onretry={loadMonitors} />
		{/if}
	{/snippet}
	{#snippet search()}
		<Search {map} />
	{/snippet}
	{@render children()}
</MapShell>
