/**
 * Light entry (`@sjvair/monitor-map/core`): what a host app needs at startup, without the map.
 *
 * Nothing imported here may reach @maptiler/sdk, @maptiler/weather or uplot at runtime;
 * `npm run test:bundle` enforces it. Everything is re-exported from the same modules the
 * main entry uses, so `monitorsManager` and the router context stay single instances
 * whichever entries a host mixes.
 */
export {
	ROUTER_KEY,
	provideMonitorMapRouter,
	useMonitorMapRouter,
	type MonitorMapRouterApi
} from "./router-context";
export { monitorsManager } from "./monitors/monitors.svelte.js";
export type { MonitorsManager } from "./monitors/monitors.svelte.js";
export type { MonitorsDataSource, MonitorsPollutant } from "./monitors/types";
