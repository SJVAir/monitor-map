# Search Module: Vue → Svelte 5 Conversion

**Date:** 2026-06-23
**Branch:** feat/search

## Overview

Convert the `src/lib/search/` module from Vue 3 to Svelte 5, replacing Leaflet with MapTiler SDK, Vue composables with Svelte singletons, and Vue Router with sv-router. Styles are rewritten in Tailwind CSS v4. The discriminated union pattern replaces class-based result types.

## Files Changed

| File | Action |
|---|---|
| `src/lib/search/MonitorSearch.vue` | Delete |
| `src/lib/search/service.ts` | Rewrite in place |
| `src/lib/search/MonitorSearch.svelte` | Create (new) |
| `src/lib/utils.ts` | Add `debounce` utility |

No other files outside `src/lib/search/` are modified, except the `debounce` addition to the shared utils.

## service.ts

### Result Types

Replace `MonitorSearchResult` and `GeocodeSearchResult` classes with a discriminated union:

```ts
type MonitorResult = {
  type: "monitor";
  monitor: MonitorLatestType<"pm25" | "o3">;
  logo: { url: string; alt: string };
};

type GeocodeResult = {
  type: "geocode";
  feature: GeocodingFeature;
};

export type SearchResult = MonitorResult | GeocodeResult;
```

`GeocodingFeature` is imported from `@maptiler/sdk`. The custom `MapTilerFeature` interface is removed entirely.

### monitorSearch(query)

Iterates `monitorsManager.latest?.values()`. Applies exact match → startsWith → includes, case-insensitive. Returns up to 4 `MonitorResult` items. Falls back to an empty array if `monitorsManager.latest` is null (not yet initialized).

### geocode(query)

Uses `geocoding.forward()` from `@maptiler/sdk` (no raw fetch). For proximity, wraps `navigator.geolocation.getCurrentPosition()` in a promise with a 3-second timeout, falling back to the SJV center `[-119.8, 36.76]` if geolocation is denied or times out. Options: `{ country: "us", fuzzyMatch: true, limit: 4, proximity: [lng, lat] }`. Returns up to 4 `GeocodeResult` items.

### Logo assets

Import paths updated to `../assets/logos/`. The old `icon-128.webp` (SJVAir) is replaced with `../assets/logos/sjvair.svg`.

## MonitorSearch.svelte

### State

```ts
let collapsed = $state(true);
let searchText = $state("");
let results: SearchResult[] = $state([]);
let marker: Marker | null = $state(null);
let inputEl: HTMLInputElement;
```

### Search Flow (debounced 500ms)

1. Empty input → clear `results`, remove `marker`
2. `monitorSearch(searchText)` → if results, use them
3. If no monitor results and `searchText.length > 4` → `geocode(searchText)`, use those

### Interactions

| Trigger | Action |
|---|---|
| Search icon click | Expand pill, focus input |
| Monitor result click | `navigate("/monitor/:id", { params: { id: monitor.id } })`, clear and close search |
| Geocode result click | Place/replace `Marker` at `feature.center`; `flyTo` (zoom 16 for `"address"` place type, map default otherwise); collapse results, keep search text |
| Clear (×) button click | Clear `searchText`, `results`, remove `marker` |
| Click outside | Collapse and clear via a Svelte `use:clickOutside` action |

The `Marker` class is imported from `@maptiler/sdk`. The previous marker is removed before placing a new one.

### Debounce

`debounce<T extends (...args: unknown[]) => void>(fn: T, wait: number): T` lives in `src/lib/utils.ts` and is imported as `import { debounce } from "$lib/utils"`.

### Layout (Tailwind)

- Outer pill: `bg-white shadow-md rounded-full overflow-hidden transition-all duration-300`
- Collapsed state: `w-12 h-12` — only the search icon button visible
- Expanded state: `w-72` — icon button + text input + optional clear button
- Search icon button: 48×48, blue filled circle, white icon
- Results list: `max-h-0` → `max-h-80` transition, scrollable, 48px-tall rows with hover highlight and dividers

### Click-Outside Action

A local Svelte action (`clickOutside`) added inline in the component attaches a `document` click listener on mount and removes it on destroy. Fires a callback when the click target is outside the component's root element.
