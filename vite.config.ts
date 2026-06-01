import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { enhancedImages } from "@sveltejs/enhanced-img";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
	const devMode = mode === "development";

	return {
		base: devMode ? "/" : "/static/monitor-map/",
		plugins: [tailwindcss(), enhancedImages(), svelte()],
		resolve: {
			alias: {
				$lib: fileURLToPath(new URL("./src/lib", import.meta.url))
			}
		},
		build: {
			target: "es2024",
			outDir: fileURLToPath(new URL("./dist", import.meta.url)),
			rolldownOptions: {
				input: {
					sjvairMonitorMap: fileURLToPath(new URL("./src/main.ts", import.meta.url))
				},
				output: {
					entryFileNames: "[name].js",
					assetFileNames: "[name].[ext]"
				}
			}
		}
	};
});
