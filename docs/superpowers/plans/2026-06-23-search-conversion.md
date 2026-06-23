# Search Module: Vue → Svelte 5 Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `src/lib/search/` from Vue 3 to Svelte 5, replacing Leaflet with MapTiler SDK, Vue composables with Svelte singletons, and class-based result types with a discriminated union.

**Architecture:** `service.ts` is rewritten in place — it exports a `SearchResult` discriminated union and two async functions (`monitorSearch`, `geocode`). `MonitorSearch.svelte` is a new Svelte 5 component that owns all UI state and calls the service. The old `MonitorSearch.vue` is deleted.

**Tech Stack:** Svelte 5 runes, MapTiler SDK (`geocoding`, `Marker`), `@sjvair/sdk` (`MonitorLatestType`), Tailwind CSS v4, sv-router (`navigate`).

> **Note:** No test framework is configured in this project (`npm run check` is the verification step for every task).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/utils.ts` | Modify | Add shared `debounce` utility |
| `src/lib/search/service.ts` | Rewrite | Discriminated union types, monitor search, geocode API |
| `src/lib/search/MonitorSearch.svelte` | Create | Search UI component |
| `src/lib/search/MonitorSearch.vue` | Delete | Remove old Vue component |

---

## Task 1: Add `debounce` to `src/lib/utils.ts`

**Files:**
- Modify: `src/lib/utils.ts`

- [ ] **Step 1: Append the debounce function**

Add to the bottom of `src/lib/utils.ts`:

```ts
export function debounce<T extends (...args: Parameters<T>) => void>(
	fn: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timer: ReturnType<typeof setTimeout>;
	return (...args: Parameters<T>) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), wait);
	};
}
```

- [ ] **Step 2: Verify no type errors**

```bash
npm run check
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat: add debounce utility to utils"
```

---

## Task 2: Rewrite `service.ts`

**Files:**
- Rewrite: `src/lib/search/service.ts`

- [ ] **Step 1: Replace the entire file with the following**

```ts
import { geocoding, type GeocodingFeature } from "@maptiler/sdk";
import type { MonitorLatestType } from "@sjvair/sdk";
import { monitorsManager } from "$lib/monitors/monitors.svelte";
import AirGradientLogo from "../assets/logos/airgradient-blue.svg";
import AirNowLogo from "../assets/logos/airnow-compact.jpg";
import CarbLogo from "../assets/logos/carb-compact.jpg";
import PurpleairLogo from "../assets/logos/purpleair-compact.png";
import SJVAirLogo from "../assets/logos/sjvair.svg";

export type MonitorResult = {
	type: "monitor";
	monitor: MonitorLatestType<"pm25" | "o3">;
	logo: { url: string; alt: string };
};

export type GeocodeResult = {
	type: "geocode";
	feature: GeocodingFeature;
};

export type SearchResult = MonitorResult | GeocodeResult;

const SJV_CENTER: [number, number] = [-119.8, 36.76];

function getMonitorLogo(monitor: MonitorLatestType<"pm25" | "o3">): { url: string; alt: string } {
	switch (monitor.data_source.name) {
		case "AQview":
			return { url: CarbLogo, alt: "AQview" };
		case "AirNow.gov":
			return { url: AirNowLogo, alt: "AirNow.gov" };
		case "PurpleAir":
			return { url: PurpleairLogo, alt: "PurpleAir" };
		case "Central California Asthma Collaborative":
			return { url: SJVAirLogo, alt: "Central California Asthma Collaborative" };
		case "AirGradient":
			return { url: AirGradientLogo, alt: "AirGradient" };
		default:
			return { url: "", alt: "" };
	}
}

async function getProximity(): Promise<[number, number]> {
	return new Promise((resolve) => {
		if (!navigator.geolocation) {
			resolve(SJV_CENTER);
			return;
		}
		const timeout = setTimeout(() => resolve(SJV_CENTER), 3000);
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				clearTimeout(timeout);
				resolve([pos.coords.longitude, pos.coords.latitude]);
			},
			() => {
				clearTimeout(timeout);
				resolve(SJV_CENTER);
			}
		);
	});
}

export async function monitorSearch(query: string): Promise<SearchResult[]> {
	if (!monitorsManager.latest) return [];
	const normalized = query.toLowerCase();
	const results: MonitorLatestType<"pm25" | "o3">[] = [];

	for (const monitor of monitorsManager.latest.values()) {
		const name = monitor.name.toLowerCase();
		if (name === normalized || name.startsWith(normalized) || name.includes(normalized)) {
			results.push(monitor);
		}
		if (results.length >= 4) break;
	}

	return results.map((monitor) => ({
		type: "monitor" as const,
		monitor,
		logo: getMonitorLogo(monitor)
	}));
}

export async function geocode(query: string): Promise<SearchResult[]> {
	const proximity = await getProximity();
	try {
		const result = await geocoding.forward(query, {
			country: ["us"],
			fuzzyMatch: true,
			limit: 4,
			proximity
		});
		return result.features.map((feature) => ({ type: "geocode" as const, feature }));
	} catch {
		return [];
	}
}
```

- [ ] **Step 2: Verify no type errors**

```bash
npm run check
```

Expected: no errors from `service.ts`. If `monitor.data_source.name` produces a type error, `MonitorLatestType` inherits `data_source` from the base monitor schema — confirm the `@sjvair/sdk` version matches the one used in `monitors.svelte.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/search/service.ts
git commit -m "feat: rewrite search service with discriminated union types and MapTiler SDK geocoding"
```

---

## Task 3: Create `MonitorSearch.svelte`

**Files:**
- Create: `src/lib/search/MonitorSearch.svelte`

- [ ] **Step 1: Create the file with the following content**

```svelte
<script lang="ts">
	import { Marker } from "@maptiler/sdk";
	import { navigate } from "../../router";
	import { mapManager } from "$lib/map/map.svelte";
	import { debounce } from "$lib/utils";
	import { monitorSearch, geocode, type SearchResult } from "./service";

	let collapsed = $state(true);
	let searchText = $state("");
	let results: SearchResult[] = $state([]);
	let marker: Marker | null = $state(null);
	let inputEl: HTMLInputElement;

	const containerClass = $derived(
		[
			"flex flex-col bg-white shadow-md overflow-hidden transition-all duration-300 select-none",
			collapsed ? "w-12 h-12 rounded-full" : "w-72",
			!collapsed && results.length ? "rounded-[26px]" : "rounded-full"
		].join(" ")
	);

	const resultsClass = $derived(
		`overflow-y-auto transition-all duration-300 divide-y divide-gray-100 ${
			results.length && !collapsed ? "max-h-80" : "max-h-0"
		}`
	);

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

	function openSearch() {
		if (collapsed) {
			collapsed = false;
			setTimeout(() => inputEl?.focus(), 0);
		}
	}

	function clearSearch() {
		searchText = "";
		results = [];
		marker?.remove();
		marker = null;
	}

	async function handleInput() {
		if (!searchText) {
			results = [];
			marker?.remove();
			marker = null;
			return;
		}
		const monitorResults = await monitorSearch(searchText);
		if (monitorResults.length) {
			results = monitorResults;
		} else if (searchText.length > 4) {
			results = await geocode(searchText);
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
		await navigate("/monitor/:id", { params: { id: result.monitor.id } });
	}

	function selectGeocode(result: Extract<SearchResult, { type: "geocode" }>) {
		const { feature } = result;
		marker?.remove();
		marker = null;
		if (mapManager.map) {
			marker = new Marker().setLngLat(feature.center).addTo(mapManager.map);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const isAddress = (feature as any).place_type?.[0] === "address";
			mapManager.map.flyTo({
				center: feature.center,
				...(isAddress && { zoom: 16 })
			});
		}
		results = [];
		collapsed = true;
	}
</script>

<div class={containerClass} use:clickOutside>
	<div class="flex items-center w-full h-12 flex-shrink-0">
		<button
			class="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full bg-brand border-4 border-white"
			onclick={openSearch}
			aria-label="Open search"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="w-6 h-6 text-white"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2.5"
			>
				<circle cx="11" cy="11" r="7" />
				<line x1="16.5" y1="16.5" x2="22" y2="22" />
			</svg>
		</button>
		{#if !collapsed}
			<input
				bind:this={inputEl}
				bind:value={searchText}
				oninput={debouncedSearch}
				type="text"
				placeholder="Search monitors or locations..."
				class="flex-1 h-full px-2 text-sm bg-transparent border-none outline-none"
			/>
			{#if searchText}
				<button
					onclick={clearSearch}
					class="px-2 text-gray-400 hover:text-gray-600 text-xl leading-none"
					aria-label="Clear search"
				>
					×
				</button>
			{/if}
		{/if}
	</div>
	<div class={resultsClass}>
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
							class="w-10 h-10 object-contain mr-3 flex-shrink-0"
						/>
					{/if}
					<span class="text-sm truncate">{result.monitor.name}</span>
				</button>
			{:else}
				<button
					onclick={() => selectGeocode(result)}
					class="flex items-center w-full h-12 px-4 hover:brightness-95 bg-white text-left"
				>
					<span class="svg-icon location-on bg-brand w-6 h-6 flex-shrink-0 mr-3"></span>
					<div class="min-w-0">
						{@const comma = result.feature.place_name.indexOf(",")}
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
```

- [ ] **Step 2: Verify no type errors**

```bash
npm run check
```

Expected: no errors. If `result.monitor.id` causes a type error, `MonitorLatestType` inherits `id: string` from the base monitor schema — it is the same field used as a map key in `monitors.svelte.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/search/MonitorSearch.svelte
git commit -m "feat: add MonitorSearch Svelte 5 component"
```

---

## Task 4: Remove `MonitorSearch.vue`

**Files:**
- Delete: `src/lib/search/MonitorSearch.vue`

- [ ] **Step 1: Delete the old Vue file**

```bash
git rm src/lib/search/MonitorSearch.vue
```

- [ ] **Step 2: Final type check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove old Vue MonitorSearch component"
```
