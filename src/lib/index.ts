/**
 * Usage in a host app:
 *
 * ```ts
 * // router.ts
 * import { createRouter } from "sv-router";
 * import { monitorMapRoutes } from "@sjvair/monitor-map";
 *
 * export const { route, navigate, p, isActive, Router } = createRouter({
 *   "/my-map": monitorMapRoutes
 *   // ...the host app's own routes
 * });
 * ```
 *
 * ```svelte
 * <!-- app root -->
 * <script>
 *   import { provideMonitorMapRouter } from "@sjvair/monitor-map";
 *   import { route, navigate, p, isActive, Router } from "./router";
 *
 *   provideMonitorMapRouter({ route, navigate, p, isActive, basePath: "/my-map" });
 * </script>
 *
 * <Router />
 * ```
 */
export { monitorMapRoutes } from "./routes";
export {
	ROUTER_KEY,
	provideMonitorMapRouter,
	useMonitorMapRouter,
	type MonitorMapRouterApi
} from "./router-context";

// State managers
export { monitorsManager } from "./monitors/monitors.svelte";
export type { MonitorsManager } from "./monitors/monitors.svelte";
export { collocationSitesManager } from "./collocation-sites/collocations.svelte";
export type { CollocationSitesManager } from "./collocation-sites/collocations.svelte";
export { evStationsManager } from "./ev-stations/ev-stations.svelte";
export type { EvStationsManager } from "./ev-stations/ev-stations.svelte";
export { hmsManager } from "./hms/hms.svelte";
export type { HMSManager } from "./hms/hms.svelte";
export { mapManager, DefaultMapStyle, initializeMap } from "./map/map.svelte";
export type { MapManager } from "./map/map.svelte";

// Map integrations
export { monitorsMapIntegration } from "./monitors/monitors-map-integration.svelte";
export { collocationSitesMapIntegration } from "./collocation-sites/collocations-map-integration.svelte";
export { evStationsMapIntegration } from "./ev-stations/ev-stations-map-integration.svelte";
export { windMapIntegration } from "./wind/wind.svelte";
export { baseLayerSeperator } from "./map/integrations/base-layer-seperator";
export { hmsFireMapIntegration } from "./hms/hms-fire-map-integration.svelte";
export { hmsSmokeMapIntegration } from "./hms/hms-smoke-map-integration.svelte";

// Components
export { default as Map } from "./map/Map.svelte";
export { default as Menu } from "./map/Menu.svelte";
export {
	default as LoadScreen,
	loadScreenState,
	enable as enableLoadScreen,
	disable as disableLoadScreen
} from "./LoadScreen.svelte";
export type { LoadScreenState } from "./LoadScreen.svelte";
export { default as MonitorsDisplayOptions } from "./monitors/components/MonitorsDisplayOptions.svelte";
export { default as EvStationsDisplayOptions } from "./ev-stations/components/EvStationsDisplayOptions.svelte";
export { default as MapLayersDisplayOptions } from "./components/MapLayersDisplayOptions.svelte";
export { default as MapStyleDisplayOptions } from "./map/MapStyleDisplayOptions.svelte";
export { default as ToggleSwitch } from "./components/ToggleSwitch.svelte";
export { default as SegmentedControl } from "./components/SegmentedControl.svelte";

// Integration base classes (extend these to add custom map features)
export { MapIntegration } from "./map/integrations/map-integration.svelte";
export { MapLayerIntegration } from "./map/integrations/map-layer-integration.svelte";
export { MapIconLayerIntegration as MapGeoJSONIntegration } from "./map/integrations/map-geojson-integration.svelte";

// Types
export type { SomeMapIntegration } from "./map/integrations/types";
export type { MonitorsMapIntegration } from "./monitors/monitors-map-integration.svelte";
export type { WindMapIntegration } from "./wind/wind.svelte";
export type { EvStationsMapIntegration } from "./ev-stations/ev-stations-map-integration.svelte";
export type { HMSFireMapIntegration } from "./hms/hms-fire-map-integration.svelte";
export type { HMSSmokeMapIntegration } from "./hms/hms-smoke-map-integration.svelte";
export type { HMSFireGroup } from "./hms/hms.svelte";
export type {
	MonitorMapFeature,
	MonitorMarkerProperties,
	MonitorClusterMapFeature,
	MonitorClusterMarkerProperties
} from "./monitors/types";
export type {
	CollocationSiteMapFeature,
	CollocationSiteMarkerProperties
} from "./collocation-sites/types";
export type {
	EvStation,
	EvStationMarkerProperties,
	EvStationMapFeature,
	EvStationClusterMapFeature
} from "./ev-stations/types";
