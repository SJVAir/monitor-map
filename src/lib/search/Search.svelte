<script lang="ts">
	import { onDestroy } from "svelte";
	import { Marker } from "@maptiler/sdk";
	import { SearchIcon } from "@lucide/svelte";
	import { useMonitorMapRouter } from "../router-context";
	import { mapManager } from "$lib/map/map.svelte";
	import { debounce } from "$lib/utils";
	import { monitorSearch, geocode, type SearchResult } from "./service";
	import { monitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte";

	const { navigate, basePath } = useMonitorMapRouter();

	let collapsed = $state(true);
	let searchText = $state("");
	let results: SearchResult[] = $state([]);
	let marker: Marker | null = $state.raw(null);
	let inputEl: HTMLInputElement | null = $state(null);

	function clickOutside(node: HTMLElement) {
		function handler(e: MouseEvent) {
			if (!collapsed && !node.contains(e.target as Node)) {
				collapsed = true;
				searchText = "";
				results = [];
			}
		}
		document.addEventListener("click", handler, true);
		return {
			destroy() {
				document.removeEventListener("click", handler, true);
			}
		};
	}

	async function openSearch() {
		if (collapsed) {
			collapsed = false;
			inputEl?.focus();
		}
	}

	function clearSearch() {
		searchText = "";
		results = [];
		marker?.remove();
		marker = null;
	}

	async function handleInput() {
		const query = searchText;
		if (!query) {
			results = [];
			marker?.remove();
			marker = null;
			return;
		}
		const monitorResults = await monitorSearch(query);
		if (searchText !== query) return;
		if (monitorResults.length) {
			results = monitorResults;
		} else if (query.length > 4) {
			const geo = await geocode(query);
			if (searchText !== query) return;
			results = geo;
		} else {
			results = [];
		}
	}

	const debouncedSearch = debounce(handleInput, 500);

	async function selectMonitor(result: Extract<SearchResult, { type: "monitor" }>) {
		collapsed = true;
		searchText = "";
		results = [];
		marker?.remove();
		marker = null;
		if (mapManager.map && result.monitor.position) {
			const { coordinates } = result.monitor.position;
			const center: [number, number] = [coordinates[0], coordinates[1]];
			mapManager.map.flyTo({
				center,
				zoom: 12
			});
		}
		await navigate(`${basePath}/monitor/:id`, { params: { id: result.monitor.id } });
		monitorsMapIntegration.selectedMonitorId = result.monitor.id;
	}

	function selectGeocode(result: Extract<SearchResult, { type: "geocode" }>) {
		const { feature } = result;
		marker?.remove();
		marker = null;
		if (mapManager.map) {
			const center: [number, number] = [feature.center[0], feature.center[1]];
			marker = new Marker().setLngLat(center).addTo(mapManager.map);
			const isAddress = feature.place_type?.[0] === "address";
			mapManager.map.flyTo({
				center,
				...(isAddress && { zoom: 16 })
			});
		}
		results = [];
		collapsed = true;
	}

	onDestroy(() => {
		marker?.remove();
	});
</script>

<div
	class={[
		"flex flex-col overflow-hidden bg-white shadow-md transition-all duration-300 select-none",
		collapsed ? "h-12 w-12 rounded-full" : "w-90 rounded-3xl",
		!collapsed && results.length ? "max-h-90" : "max-h-12"
	]}
	use:clickOutside
>
	<div class="flex h-12 w-full shrink-0 items-center">
		<button
			class="bg-brand flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-white"
			onclick={openSearch}
			aria-label="Open search"
		>
			<SearchIcon size="24" color="#FFFFFF" />
		</button>
		<div class="flex h-full w-full items-center overflow-hidden">
			<input
				bind:this={inputEl}
				bind:value={searchText}
				oninput={debouncedSearch}
				type="text"
				placeholder="Search monitors or locations..."
				class="h-full w-full border-none bg-transparent px-2 text-sm outline-none"
				tabindex={collapsed ? -1 : 0}
			/>
			{#if searchText && !collapsed}
				<button
					onclick={clearSearch}
					class="cursor-pointer px-2 text-xl leading-none text-gray-400 hover:text-gray-600"
					aria-label="Clear search">×</button
				>
			{/if}
		</div>
	</div>
	<div
		class={[
			"divide-y divide-gray-100 overflow-y-auto transition-all duration-300",
			!collapsed ? "max-h-80" : "max-h-0"
		]}
	>
		{#each results as result (result.type === "monitor" ? result.monitor.id : result.feature.place_name)}
			{#if result.type === "monitor"}
				<button
					onclick={() => selectMonitor(result)}
					class="flex h-12 w-full items-center bg-white px-4 text-left hover:brightness-95"
				>
					{#if result.logo.url}
						<img
							src={result.logo.url}
							alt={result.logo.alt}
							class="mr-3 h-10 w-10 shrink-0 object-contain"
						/>
					{/if}
					<span class="truncate text-sm">{result.monitor.name}</span>
				</button>
			{:else}
				{@const comma = result.feature.place_name.indexOf(",")}
				<button
					onclick={() => selectGeocode(result)}
					class="flex h-12 w-full items-center bg-white px-4 text-left hover:brightness-95"
				>
					<span class="svg-icon location-on bg-brand mr-3 h-6 w-6 shrink-0"></span>
					<div class="min-w-0">
						<p class="truncate text-sm font-medium">
							{result.feature.place_name.substring(0, comma < 0 ? undefined : comma)}
						</p>
						{#if comma >= 0}
							<p class="text-muted-foreground truncate text-xs">
								{result.feature.place_name.substring(comma + 1).trim()}
							</p>
						{/if}
					</div>
				</button>
			{/if}
		{/each}
	</div>
</div>
