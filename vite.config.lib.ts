import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
	plugins: [svelte({ emitCss: false })],
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
			external: ["svelte", /^svelte\//],
			output: {
				preserveModules: true,
				preserveModulesRoot: "src/lib",
				dir: "dist/lib",
				entryFileNames: "[name].js"
			}
		},
		outDir: "dist/lib",
		emptyOutDir: true
	}
});
