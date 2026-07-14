import type { Routes } from "sv-router";
import MonitorMapLayout from "./MonitorMapLayout.svelte";
import MainMapView from "./MainMapView.svelte";

// Explicitly typed as sv-router's own `Routes` so declaration emission doesn't
// need to name svelte2tsx's internal per-component prop types (see
// MonitorMapLayout/MainMapView.svelte) and so this stays assignable to
// `createRouter`'s `Routes`-constrained parameter in a host app's router.ts.
export const monitorMapRoutes: Routes = {
	layout: MonitorMapLayout,
	"/": MainMapView,
	"/monitor/:id": () => import("./MonitorDetailPanel.svelte")
};
