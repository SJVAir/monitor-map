import type { Environment } from "vitest/runtime";

/**
 * Node, but with modules transformed the way Vite transforms them for a browser. That makes
 * the Svelte plugin compile rune modules for the client and resolve Svelte's browser build, so
 * `$effect`s run. There is still no DOM.
 */
export default {
	name: "node-client",
	viteEnvironment: "client",
	setup() {
		return { teardown() {} };
	}
} satisfies Environment;
