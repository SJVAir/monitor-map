import {
	createCollocationSitesStore,
	createHmsFireStore,
	createHmsSmokeStore,
	createMonitorsStore
} from "@sjvair/map-sdk/stores";

/**
 * The app-wide data stores, created once. This module imports only `@sjvair/map-sdk/stores`, so
 * the light `/core` entry can reach it without loading the map engine.
 */
export const monitorsStore = createMonitorsStore();
export const hmsSmokeStore = createHmsSmokeStore();
export const hmsFireStore = createHmsFireStore();
export const collocationSitesStore = createCollocationSitesStore({ monitors: monitorsStore });
