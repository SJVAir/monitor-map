import type { Routes } from "sv-router";
import LazyMapLayout from "./LazyMapLayout.svelte";
import LazyMonitorDetailPanel from "./LazyMonitorDetailPanel.svelte";
import MainMapView from "./MainMapView.svelte";

/**
 * Lazy routes entry (`@sjvair/monitor-map/routes`): the same route tree as the main entry's
 * `monitorMapRoutes`, but the map layout and the monitor panel load on demand, so a host
 * router can reference it at startup without loading the map.
 *
 * The components here are light wrappers that load the real ones themselves
 * (`./lazy-chunks.ts`) and show the load screen meanwhile. They are deliberately not
 * `() => import(...)` routes: sv-router renders nothing for a route until every lazy component
 * on it has loaded, which left the outlet empty on a cold link into the map.
 */
export const monitorMapRoutes: Routes = {
	layout: LazyMapLayout,
	"/": MainMapView,
	"/monitor/:id": LazyMonitorDetailPanel
};
