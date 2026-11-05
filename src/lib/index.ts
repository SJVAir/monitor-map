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
 *
 * A host that must stay light at startup imports from the subpath entries instead:
 * `provideMonitorMapRouter`/`monitorsManager` from "@sjvair/monitor-map/core" (no map), and
 * `monitorMapRoutes` from "@sjvair/monitor-map/routes" (same tree, lazy layout and routes).
 * `monitorMapRoutes` from this entry stays eager.
 */
export { monitorMapRoutes } from "./routes";
export { configureMonitorMap, monitorMapConfig, type MonitorMapConfig } from "./config.svelte.js";
export {
	ROUTER_KEY,
	provideMonitorMapRouter,
	useMonitorMapRouter,
	type MonitorMapRouterApi
} from "./router-context";
export { monitorsManager } from "./monitors/monitors.svelte.js";
export type { MonitorsManager, MonitorsInitOptions } from "./monitors/monitors.svelte.js";
