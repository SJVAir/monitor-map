import type { Routes } from "sv-router";

/**
 * Lazy routes entry (`@sjvair/monitor-map/routes`): the same route tree as the main entry's
 * `monitorMapRoutes`, but the layout and every route load on demand, so a host router can
 * reference it at startup without loading the map.
 *
 * Each component must stay a literal `() => import(...)`: sv-router recognises lazy
 * components by matching the function's source text, so a helper wrapper would break it.
 */
export const monitorMapRoutes: Routes = {
	layout: () => import("./MonitorMapLayout.svelte"),
	"/": () => import("./MainMapView.svelte"),
	"/monitor/:id": () => import("./MonitorDetailPanel.svelte")
};
