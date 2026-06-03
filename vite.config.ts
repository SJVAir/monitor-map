import { defineConfig, type Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { enhancedImages } from "@sveltejs/enhanced-img";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath, URL } from "node:url";
import postcss from "postcss";

function cssScopePlugin(scopeSelector: string): Plugin {
	return {
		name: "vite-plugin-css-scope",
		apply: "build",
		generateBundle(_options, bundle) {
			for (const chunk of Object.values(bundle)) {
				if (chunk.type !== "asset" || !chunk.fileName.endsWith(".css")) continue;
				if (typeof chunk.source !== "string") continue;

				const root = postcss.parse(chunk.source);

				// Transform :root → :scope throughout the entire tree
				root.walkRules((rule) => {
					rule.selectors = rule.selectors.map((s) =>
						s.trim().replace(/^:root\b/, ":scope")
					);
				});

				// Hoist at-rules that cannot live inside @scope
				const nonScopeableNames = new Set([
					"keyframes",
					"-webkit-keyframes",
					"font-face",
					"charset",
				]);
				const hoisted: postcss.ChildNode[] = [];
				root.each((node) => {
					if (
						node.type === "atrule" &&
						nonScopeableNames.has(node.name.toLowerCase())
					) {
						hoisted.push(node.clone());
						node.remove();
					}
				});

				// Wrap remaining nodes in @scope
				const scopeBlock = postcss.atRule({
					name: "scope",
					params: `(${scopeSelector})`,
				});
				while (root.first) {
					scopeBlock.append(root.first);
				}

				// Reassemble: hoisted rules first, then the scoped block
				hoisted.forEach((n) => root.append(n));
				root.append(scopeBlock);

				chunk.source = root.toResult().css;
			}
		},
	};
}

export default defineConfig(({ mode }) => {
	const devMode = mode === "development";

	return {
		base: devMode ? "/" : "/static/monitor-map/",
		plugins: [
			tailwindcss(),
			enhancedImages(),
			svelte(),
			...(devMode ? [] : [cssScopePlugin("#SJVAirMonitorMap")]),
		],
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
