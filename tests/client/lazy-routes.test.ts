import { describe, expect, it } from "vitest";
import { monitorMapRoutes } from "$lib/lazy-routes";

// sv-router 0.19's own isLazyImport() test (src/helpers/utils.js): it matches against the
// whole source text of a route's function.
const SV_ROUTER_LAZY = /\(\)\s?=>\s?(import|__vite_ssr_dynamic_import__)\(.*\)/;

describe("the lazy routes entry", () => {
	// A compiled component is a function too. If one of these wrappers contained a dynamic
	// import, sv-router would call it as a lazy route instead of rendering it, so the imports
	// live in lazy-chunks.ts. This runs in the client project, on client-compiled components.
	it.each(Object.entries(monitorMapRoutes))(
		"%s is a component sv-router renders at once",
		(_key, component) => {
			expect(typeof component).toBe("function");
			expect(SV_ROUTER_LAZY.test(String(component))).toBe(false);
		}
	);
});
