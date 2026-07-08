import MonitorMapLayout from "./MonitorMapLayout.svelte";
import MainMapView from "./MainMapView.svelte";

export const monitorMapRoutes = {
	layout: MonitorMapLayout,
	"/": MainMapView,
	"/monitor/:id": () => import("./MonitorDetailPanel.svelte")
};
