import { defineConfig } from "vite";
import { enhancedImages } from "@sveltejs/enhanced-img";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
	plugins: [enhancedImages(), svelte({ emitCss: false })],
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL("./src/lib", import.meta.url))
		}
	},
	build: {
		target: "es2024",
		lib: {
			entry: fileURLToPath(new URL("./src/lib/index.ts", import.meta.url)),
			formats: ["es"]
		},
		rollupOptions: {
			external: [
				"svelte",
				/^svelte\//,
				/^@maptiler\//,
				/^@sjvair\//,
				/^@tstk\//,
				/^@lucide\//,
				/^@internationalized\//,
				"bits-ui",
				"sv-router",
				"color2k",
				"clsx",
				"tailwind-merge",
				"tailwind-variants",
				"uplot",
				/^date-fns/,
				/^@turf\//,
				/^geojson/
			],
			output: {
				preserveModules: true,
				preserveModulesRoot: "src/lib",
				dir: "dist/lib",
				entryFileNames: "[name].js"
			}
		}
	}
});
