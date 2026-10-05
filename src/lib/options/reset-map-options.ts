import { tick } from "svelte";
import { monitorsManager } from "$lib/monitors/monitors.svelte";
import { monitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte";
import { collocationSitesMapIntegration } from "$lib/collocation-sites/collocations-map-integration.svelte";
import { hmsFireMapIntegration } from "$lib/hms/hms-fire-map-integration.svelte";
import { hmsSmokeMapIntegration } from "$lib/hms/hms-smoke-map-integration.svelte";
import { evStationsMapIntegration } from "$lib/ev-stations/ev-stations-map-integration.svelte";
import { windMapIntegration } from "$lib/wind/wind.svelte";
import { mapStyleState } from "$lib/map/map-style-state.svelte.js";
import { applyMapOptionDefaults } from "./map-option-defaults";

/** "Reset Map Options": restores every map option to its default. */
export function resetMapOptions(): void {
	applyMapOptionDefaults(
		{
			manager: monitorsManager,
			integration: monitorsMapIntegration,
			collocationSites: collocationSitesMapIntegration,
			hmsFire: hmsFireMapIntegration,
			hmsSmoke: hmsSmokeMapIntegration,
			evStations: evStationsMapIntegration,
			wind: windMapIntegration,
			// Defer basemap reset until integration effects flush so layers re-enabled by this reset apply against the current loaded style before setStyle() loads a new one.
			mapStyle: { reset: () => void tick().then(() => mapStyleState.reset()) }
		},
		monitorsManager.meta?.default_pollutant ?? null
	);
}
