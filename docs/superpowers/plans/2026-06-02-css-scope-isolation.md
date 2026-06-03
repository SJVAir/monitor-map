# CSS Scope Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the widget's built CSS from bleeding into the parent sjvair.com page by wrapping all output in `@scope (#SJVAirMonitorMap) {}` at build time.

**Architecture:** A Vite plugin defined inline in `vite.config.ts` hooks into `generateBundle`, parses each CSS asset with PostCSS, hoists non-scopeable at-rules (`@font-face`, `@keyframes`, `@charset`) to the top level, transforms `:root` selectors to `:scope`, and wraps everything else in `@scope (#SJVAirMonitorMap) {}`. The plugin only runs during production builds (`apply: "build"`).

**Tech Stack:** Vite 8, PostCSS (via Vite), TypeScript

---

## Files

- Modify: `vite.config.ts` — add `postcss` import, define `cssScopePlugin`, add to plugins array

---

### Task 1: Add `postcss` as a direct devDependency

PostCSS is a transitive dep of Vite but should be explicit since we're importing it directly.

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install postcss**

```bash
npm install --save-dev postcss
```

Expected output: postcss added to `devDependencies` in `package.json`.

- [ ] **Step 2: Verify install**

```bash
node -e "import('postcss').then(m => console.log('postcss ok:', m.default.version))"
```

Expected: prints `postcss ok: <version>` with no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add postcss as direct devDependency"
```

---

### Task 2: Write and integrate `cssScopePlugin` in `vite.config.ts`

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Open `vite.config.ts` and replace its contents with the following**

```ts
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
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: no type errors. (Svelte check — if it reports unrelated pre-existing errors, those are fine; there should be no new errors from the plugin code.)

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "feat: wrap built CSS in @scope to prevent style bleeding into parent"
```

---

### Task 3: Build and verify the CSS output

**Files:**
- Read: `dist/sjvairMonitorMap.css`
- Read: `dist/MonitorDetailPanel.css` (if present — it gets the same treatment automatically)

- [ ] **Step 1: Run the production build**

```bash
npm run build
```

Expected: build succeeds and `dist/` is populated with `.js` and `.css` files.

- [ ] **Step 2: Verify `@scope` wrapper is present**

```bash
node -e "
const fs = require('fs');
const css = fs.readFileSync('dist/sjvairMonitorMap.css', 'utf8');
const scope = (css.match(/@scope/g) || []).length;
const root = (css.match(/:root/g) || []).length;
const fontFace = (css.match(/@font-face/g) || []).length;
console.log('@scope blocks:', scope, scope >= 1 ? '✓' : '✗ FAIL');
console.log(':root occurrences:', root, root === 0 ? '✓' : '✗ FAIL - :root should be gone');
console.log('@font-face outside scope (total):', fontFace, fontFace >= 1 ? '✓' : '(none - ok if no fonts)');
"
```

Expected output:
```
@scope blocks: 1 ✓
:root occurrences: 0 ✓
@font-face outside scope (total): <N> ✓
```

- [ ] **Step 3: Spot-check that `@font-face` is outside the `@scope` block**

```bash
node -e "
const fs = require('fs');
const css = fs.readFileSync('dist/sjvairMonitorMap.css', 'utf8');
const scopeStart = css.indexOf('@scope');
const fontFacePositions = [];
let idx = 0;
while ((idx = css.indexOf('@font-face', idx)) !== -1) {
  fontFacePositions.push({ pos: idx, before: idx < scopeStart ? 'outside' : 'inside' });
  idx++;
}
console.log('font-face positions:', fontFacePositions);
"
```

Expected: all `@font-face` entries appear before the `@scope` block (position < scopeStart), i.e., all show `'outside'`.

- [ ] **Step 4: Verify dev build is unaffected**

```bash
npm run dev &
DEV_PID=$!
sleep 3
curl -s http://localhost:5173/ | grep -q "SJVAirMonitorMap" && echo "dev server up ✓" || echo "dev server check failed"
kill $DEV_PID
```

Expected: dev server starts and serves the page without errors. The dev CSS is not wrapped in `@scope` (that's intentional — the plugin only applies to production builds).

- [ ] **Step 5: Commit verification note**

No additional commit needed — the build artifacts in `dist/` are not committed. The implementation is already committed in Task 2.

---

## Spec Coverage Check

| Spec requirement | Covered by |
|---|---|
| Wrap all CSS in `@scope (#SJVAirMonitorMap)` | Task 2 — plugin wraps all CSS assets |
| Hoist `@keyframes`, `@font-face`, `@charset` | Task 2 — `nonScopeableNames` set + extract loop |
| Transform `:root` → `:scope` | Task 2 — `walkRules` with `.replace(/^:root\b/, ":scope")` |
| No changes to `sjvair.com` | ✓ — only `vite.config.ts` changes |
| No changes to `app.css` | ✓ — transformation is at build output level |
| `MonitorDetailPanel.css` also transformed | ✓ — plugin iterates all `.css` assets in bundle |
