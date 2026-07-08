import { getContext, setContext } from "svelte";
import type {
	ConstructUrlOptions,
	Navigation,
	NavigateOptions,
	RouterApi,
	Routes
} from "sv-router";

export const ROUTER_KEY = Symbol("monitor-map-router");

export interface MonitorMapRouterApi {
	route: RouterApi<Routes>["route"];
	/**
	 * Loosely typed against `string` rather than sv-router's literal-checked `Path<T>` union:
	 * internal calls prefix paths with `basePath` (a runtime string), which can't satisfy a
	 * template literal type checked against the host app's full route tree.
	 */
	navigate(
		path: string,
		options?: NavigateOptions & { params?: Record<string, string> }
	): Promise<Navigation>;
	p(path: string, options?: ConstructUrlOptions & { params?: Record<string, string> }): string;
	isActive: {
		(path: string, params?: Record<string, string>): boolean;
		startsWith(path: string, params?: Record<string, string>): boolean;
	};
	/**
	 * Prefix under which monitorMapRoutes is mounted in the host app's router,
	 * e.g. "" at the app root, or "/my-map" when nested under a host route.
	 */
	basePath: string;
}

export function provideMonitorMapRouter(api: MonitorMapRouterApi) {
	setContext(ROUTER_KEY, api);
}

export function useMonitorMapRouter(): MonitorMapRouterApi {
	const api = getContext<MonitorMapRouterApi>(ROUTER_KEY);
	if (!api) {
		throw new Error(
			"monitor-map router context not found. Wrap your app root with " +
				"provideMonitorMapRouter(...) before rendering monitor-map components."
		);
	}
	return api;
}
