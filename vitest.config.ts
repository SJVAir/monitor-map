import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath, URL } from "node:url";

// Separate from vite.config.ts, which requires PROD_MODE for any non-development mode.
// The Svelte plugin compiles rune modules (*.svelte.ts) imported by specs.
export default defineConfig({
	plugins: [svelte()],
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL("./src/lib", import.meta.url))
		}
	},
	test: {
		include: ["tests/**/*.test.ts"],
		environment: "node"
	}
});
