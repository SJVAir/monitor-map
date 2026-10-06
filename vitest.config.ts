import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

// Separate from vite.config.ts, which requires PROD_MODE for any non-development mode.
export default defineConfig({
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
