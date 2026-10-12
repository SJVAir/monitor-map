import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath, URL } from "node:url";

const alias = {
	$lib: fileURLToPath(new URL("./src/lib", import.meta.url))
};

// Separate from vite.config.ts, which requires PROD_MODE for any non-development mode.
// The Svelte plugin compiles rune modules (*.svelte.ts) imported by specs.
export default defineConfig({
	test: {
		projects: [
			{
				// Rune modules compile in server mode here, so their $effects never run.
				plugins: [svelte()],
				resolve: { alias },
				test: {
					name: "server",
					include: ["tests/**/*.test.ts"],
					exclude: ["tests/client/**"],
					environment: "node"
				}
			},
			{
				// Rune modules compile for the client here (see tests/client/environment.ts), so
				// their $effects do run. Still no DOM: for rune modules, not components.
				plugins: [svelte()],
				resolve: { alias, conditions: ["browser"] },
				test: {
					name: "client",
					include: ["tests/client/**/*.test.ts"],
					environment: "./tests/client/environment.ts",
					// Inlined so Vite resolves it with the "browser" condition; left external, Node
					// would load Svelte's server build, whose effects and flushSync do nothing.
					server: { deps: { inline: ["svelte", "esm-env"] } }
				}
			}
		]
	}
});
