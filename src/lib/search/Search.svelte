<script lang="ts">
	import { onDestroy } from "svelte";
	import { Marker } from "@maptiler/sdk";
	import { SearchIcon } from "@lucide/svelte";
	import { navigate } from "../../router";
	import { mapManager } from "$lib/map/map.svelte";
	import { debounce } from "$lib/utils";
	import { monitorSearch, geocode, type SearchResult } from "./service";
	import { monitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte";

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
		await navigate("/monitor/:id", { params: { id: result.monitor.id } });
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
		"flex flex-col bg-white shadow-md overflow-hidden transition-all duration-300 select-none",
		collapsed ? "w-12 h-12 rounded-full" : "w-90 rounded-3xl",
		!collapsed && results.length ? "max-h-90" : "max-h-12"
	]}
	use:clickOutside
>
	<div class="flex items-center w-full h-12 shrink-0">
		<button
			class="w-12 h-12 shrink-0 flex items-center justify-center rounded-full bg-brand border-4 border-white"
			onclick={openSearch}
			aria-label="Open search"
		>
			<SearchIcon size="24" color="#FFFFFF" />
		</button>
		<div class="overflow-hidden w-full h-full flex items-center">
			<input
				bind:this={inputEl}
				bind:value={searchText}
				oninput={debouncedSearch}
				type="text"
				placeholder="Search monitors or locations..."
				class="h-full px-2 text-sm bg-transparent border-none outline-none w-full"
				tabindex={collapsed ? -1 : 0}
			/>
			{#if searchText && !collapsed}
				<button
					onclick={clearSearch}
					class="px-2 text-gray-400 hover:text-gray-600 text-xl leading-none"
					aria-label="Clear search">×</button
				>
			{/if}
		</div>
	</div>
	<div
		class={[
			"overflow-y-auto transition-all duration-300 divide-y divide-gray-100",
			!collapsed ? "max-h-80" : "max-h-0"
		]}
	>
		{#each results as result (result.type === "monitor" ? result.monitor.id : result.feature.place_name)}
			{#if result.type === "monitor"}
				<button
					onclick={() => selectMonitor(result)}
					class="flex items-center w-full h-12 px-4 hover:brightness-95 bg-white text-left"
				>
					{#if result.logo.url}
						<img
							src={result.logo.url}
							alt={result.logo.alt}
							class="w-10 h-10 object-contain mr-3 shrink-0"
						/>
					{/if}
					<span class="text-sm truncate">{result.monitor.name}</span>
				</button>
			{:else}
				{@const comma = result.feature.place_name.indexOf(",")}
				<button
					onclick={() => selectGeocode(result)}
					class="flex items-center w-full h-12 px-4 hover:brightness-95 bg-white text-left"
				>
					<span class="svg-icon location-on bg-brand w-6 h-6 shrink-0 mr-3"></span>
					<div class="min-w-0">
						<p class="text-sm font-medium truncate">
							{result.feature.place_name.substring(0, comma < 0 ? undefined : comma)}
						</p>
						{#if comma >= 0}
							<p class="text-xs text-muted-foreground truncate">
								{result.feature.place_name.substring(comma + 1).trim()}
							</p>
						{/if}
					</div>
				</button>
			{/if}
		{/each}
	</div>
</div>
