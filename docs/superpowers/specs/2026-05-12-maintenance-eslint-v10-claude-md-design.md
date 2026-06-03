# Maintenance: ESLint v10 Config + CLAUDE.md Update

**Date:** 2026-05-12
**Scope:** Two file updates — no new features, no library changes.

---

## 1. ESLint Config (`eslint.config.js`)

### Problem

- `ts.config()` from `typescript-eslint` returns the deprecated `ConfigArray` type
- Config uses `svelte.configs.recommended` / `svelte.configs.prettier` instead of the flat-config-specific `svelte.configs["flat/recommended"]` / `svelte.configs["flat/prettier"]` from eslint-plugin-svelte v3
- `ts.configs.recommended` and svelte configs are spread unnecessarily — ESLint v10's `defineConfig` flattens nested arrays natively
- Redundant `ignores` inside the Svelte block (`.svelte` files can't match `eslint.config.js` or `svelte.config.js`)

### Solution

Replace `ts.config()` with `defineConfig` from `"eslint/config"` (ESLint v10 native). Pass array configs directly without spreading. Use explicit `flat/` variants for the svelte plugin.

### Updated config shape

```js
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";
import js from "@eslint/js";
import { includeIgnoreFile } from "@eslint/compat";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import { fileURLToPath } from "node:url";
import ts from "typescript-eslint";
import svelteConfig from "./svelte.config.js";

const gitignorePath = fileURLToPath(new URL("./.gitignore", import.meta.url));

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs["flat/recommended"],
	prettier,
	svelte.configs["flat/prettier"],
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		}
	},
	{
		files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: [".svelte"],
				parser: ts.parser,
				svelteConfig
			}
		}
	}
);
```

---

## 2. CLAUDE.md

### Problem

The file still describes the old SvelteKit architecture (SSR load, `src/routes/+page.ts`, `svelte-package`). The project has been rewritten to plain Svelte 5 + Vite + sv-router.

### Changes

**Commands section:**

- Change `build` description from "vite build + svelte-package" to "vite build (widget)"
- Add `build:lib` entry: "library build for Capacitor app workspace import"

**Architecture Overview:**

- Change "SvelteKit 5 app (packaged as a library via `svelte-package`)" to "Svelte 5 + Vite app"
- Add sub-section: **Entry & Routing** — describes `src/main.ts` mounting `App.svelte`, `src/router.ts` (sv-router `createRouter`), and the CSS grid panel animation in `App.svelte`
- Remove SSR load step from Monitor Data Flow; replace with: App.svelte calls `monitorsManager.init()` on mount
- Update step 2 to reference `monitorsManager` (already correct name)

**Key Libraries table:**

- Add `sv-router` row: "Client-side routing"

**Code Style:**

- Change "flat config, v9" → "flat config, v10"
