import { defineConfig, UserConfig, type Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { enhancedImages } from "@sveltejs/enhanced-img";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath, URL } from "node:url";
import postcss from "postcss";

export default defineConfig(({ mode }) => {
	const { base, build, experimental, plugins } = getConfig(mode);

	return {
		base,
		plugins: [tailwindcss(), enhancedImages(), svelte(), ...plugins],
		resolve: {
			alias: {
				$lib: fileURLToPath(new URL("./src/lib", import.meta.url))
			}
		},
		build,
		experimental
	};
});

type ProductionBuildMode = "production" | "local";
type PartialConfig = Required<Pick<UserConfig, "base" | "build" | "experimental" | "plugins">>;

/*
 * Config for development
 */
const devConfig: PartialConfig = {
	base: "/",
	build: {},
	experimental: {},
	plugins: []
};

/*
 * Base config for production build. Can be used by itself
 * for compiling a production build intended to be used in
 * local sjvair.com build
 */
const baseProdConfig: PartialConfig = {
	base: "/static/monitor-map/",
	build: {
		target: "es2024",
		outDir: fileURLToPath(new URL("./dist/monitor-map", import.meta.url)),
		rolldownOptions: {
			input: {
				sjvairMonitorMap: fileURLToPath(new URL("./src/main.ts", import.meta.url))
			},
			output: {
				entryFileNames: "[name].js",
				assetFileNames: "[name].[ext]"
			}
		}
	},
	experimental: {},
	plugins: [cssScopePlugin("#SJVAirMonitorMap")]
};

/*
 * Config for remote deployment. Can be used for staging or production
 */
const prodConfig: PartialConfig = {
	...baseProdConfig,
	experimental: {
		renderBuiltUrl(filename, { hostType }) {
			// JS-imported assets (including @sveltejs/enhanced-img output)
			// resolve their CDN base at runtime via window.__cdnUrl, which is
			// defined per-environment by the Django template embedding this
			// widget (sourced from STATIC_URL in settings). This means the
			// same build artifact works correctly in any environment —
			// no CDN_BASE_URL env var or per-environment rebuild needed.
			if (hostType === "js") {
				return { runtime: `window.__cdnUrl(${JSON.stringify(filename)})` };
			}
			// CSS url() references resolve relative to the stylesheet's own
			// URL. Since the compiled CSS is served from the CDN, a relative
			// path here already lands correctly — no runtime resolution
			// possible or needed for CSS/HTML hostTypes.
			return { relative: true };
		}
	}
};

function getConfig(mode: string) {
	if (mode === "development") {
		return devConfig;
	} else {
		const invalidValueMsg =
			'This must be set to either "local" for local production builds, or "production` for deployed production builds.';

		switch (process.env.PROD_MODE as ProductionBuildMode) {
			case undefined:
				throw new Error(`Environment variable "PROD_MODE" is not defined. ${invalidValueMsg}`);

			case "local":
				return baseProdConfig;

			case "production":
				return prodConfig;

			default:
				throw new Error(
					`PROD_MODE=${process.env.PROD_MODE} is not a valid value. ${invalidValueMsg}`
				);
		}
	}
}

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
					rule.selectors = rule.selectors.map((s) => s.trim().replace(/^:root\b/, ":scope"));
				});

				// Hoist at-rules that cannot live inside @scope
				const nonScopeableNames = new Set([
					"keyframes",
					"-webkit-keyframes",
					"font-face",
					"charset"
				]);
				const hoisted: postcss.ChildNode[] = [];
				root.each((node) => {
					if (node.type === "atrule" && nonScopeableNames.has(node.name.toLowerCase())) {
						hoisted.push(node.clone());
						node.remove();
					}
				});

				// Wrap remaining nodes in @scope
				const scopeBlock = postcss.atRule({
					name: "scope",
					params: `(${scopeSelector})`
				});
				while (root.first) {
					scopeBlock.append(root.first);
				}

				// Reassemble: hoisted rules first, then the scoped block
				hoisted.forEach((n) => root.append(n));
				root.append(scopeBlock);

				chunk.source = root.toResult().css;
			}
		}
	};
}
