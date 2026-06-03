import { createRouter } from "sv-router";
import MapView from "./MapView.svelte";

export const { p, navigate, isActive, route } = createRouter({
	"/": MapView,
	"/monitor/:id": () => import("./MonitorDetailPanel.svelte")
});
