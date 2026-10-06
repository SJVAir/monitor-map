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
export {
	monitorsMapIntegration,
	MonitorsMapIntegration
} from "./monitors/monitors-map-integration.svelte";
export { collocationSitesMapIntegration } from "./collocation-sites/collocations-map-integration.svelte";
export { evStationsMapIntegration } from "./ev-stations/ev-stations-map-integration.svelte";
export { windMapIntegration } from "./wind/wind.svelte";
export { baseLayerSeperator } from "./map/integrations/base-layer-seperator";
export { hmsFireMapIntegration } from "./hms/hms-fire-map-integration.svelte";
export { hmsSmokeMapIntegration } from "./hms/hms-smoke-map-integration.svelte";

// Components
export { default as Map } from "./map/Map.svelte";
export { default as MapShell, type MapShellProps } from "./map/MapShell.svelte";
export {
	default as LoadScreen,
	loadScreenState,
	enable as enableLoadScreen,
	disable as disableLoadScreen
} from "./LoadScreen.svelte";
export type { LoadScreenState } from "./LoadScreen.svelte";

// Options toolbar / panel (compose these inside MapShell's `menu` snippet)
export { default as OptionsBar } from "./options/OptionsBar.svelte";
export { default as OptionsGroup } from "./options/OptionsGroup.svelte";
export { default as OptionsMenu } from "./options/OptionsMenu.svelte";
export { default as CheckboxRow } from "./options/rows/CheckboxRow.svelte";
export { default as RadioRow } from "./options/rows/RadioRow.svelte";
export { default as SubmenuRow } from "./options/rows/SubmenuRow.svelte";
export { default as GroupRow } from "./options/rows/GroupRow.svelte";
export { default as MarkerIcon } from "./options/rows/MarkerIcon.svelte";
export { default as PollutantMenu } from "./options/menus/PollutantMenu.svelte";
export { default as MonitorsMenu } from "./options/menus/MonitorsMenu.svelte";
export { default as LayersMenu } from "./options/menus/LayersMenu.svelte";
export { default as OverlaysMenu } from "./options/menus/OverlaysMenu.svelte";
export { default as SettingsMenu } from "./options/menus/SettingsMenu.svelte";
export { resetMapOptions } from "./options/reset-map-options";
export { mapStyleState } from "./map/map-style-state.svelte.js";
export type { MapStyleState } from "./map/map-style-state.svelte.js";

// Legend
export { default as Legend } from "./legend/Legend.svelte";
export { default as LegendBar } from "./legend/LegendBar.svelte";
export {
	pollutantLegendSection,
	fireSmokeLegendSections,
	type LegendSection,
	type LegendBarData,
	type LegendCategory
} from "./legend/legend-data";
export { FIRE_LEGEND_CATEGORIES } from "./hms/hms-fire-icon-manager";
export { SMOKE_LEGEND } from "./hms/hms-smoke-map-integration.svelte";

// Integration base classes (extend these to add custom map features)
export { MapIntegration } from "./map/integrations/map-integration.svelte";
export { MapLayerIntegration } from "./map/integrations/map-layer-integration.svelte";
export { MapIconLayerIntegration as MapGeoJSONIntegration } from "./map/integrations/map-geojson-integration.svelte";

// Types
export type { SomeMapIntegration } from "./map/integrations/types";
export type { WindMapIntegration } from "./wind/wind.svelte";
export type { EvStationsMapIntegration } from "./ev-stations/ev-stations-map-integration.svelte";
export type { HMSFireMapIntegration } from "./hms/hms-fire-map-integration.svelte";
export type { HMSSmokeMapIntegration } from "./hms/hms-smoke-map-integration.svelte";
export type { HMSFireGroup } from "./hms/hms.svelte";
export type {
	MonitorMapFeature,
	MonitorMarkerProperties,
	MonitorClusterMapFeature,
	MonitorClusterMarkerProperties,
	MonitorsDataSource,
	MonitorsPollutant
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
