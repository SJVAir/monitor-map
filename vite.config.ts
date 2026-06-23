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

type ProductionBuildMode = "production" | "local" | "staging";
type PartialConfig = Required<Pick<UserConfig, "base" | "build" | "experimental" | "plugins">>;

const PROD_CDN_BASE = "https://sjvair-production.s3.amazonaws.com/static";
const STAGING_CDN_BASE = "https://sjvair-staging.s3.amazonaws.com/static";

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
const prodConfig = (cdnBase: string): PartialConfig => ({
	...baseProdConfig,
	experimental: {
		renderBuiltUrl(filename, { hostType, type }) {
			// Only rewrite image/asset files — leave JS and CSS alone
			if (type === "asset") {
				return `${cdnBase}/monitor-map/${filename}`;
			}
			// JS references use a runtime expression so the base stays dynamic
			if (hostType === "js") {
				return { runtime: `window.__cdnUrl(${JSON.stringify(filename)})` };
			}
			// CSS and HTML fall back to the normal relative/base behaviour
			return { relative: true };
		}
	}
});

function getConfig(mode: string) {
	if (mode === "development") {
		return devConfig;
	} else {
		return getProdBuildConfig();
	}
}

function getProdBuildConfig(): PartialConfig {
	switch (process.env.PROD_MODE as ProductionBuildMode) {
		case "local":
			return baseProdConfig;

		case "production":
			return prodConfig(PROD_CDN_BASE);

		case "staging":
			return prodConfig(STAGING_CDN_BASE);

		default:
			return prodConfig(PROD_CDN_BASE);
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
