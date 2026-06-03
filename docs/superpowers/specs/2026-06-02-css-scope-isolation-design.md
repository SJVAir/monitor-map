# CSS Scope Isolation — Design Spec

**Date:** 2026-06-02
**Branch:** feat/pollutant-url-query-parameters (or new branch)
**Status:** Approved

## Problem

When `sjvairMonitorMap.css` is loaded as a global stylesheet in `sjvair.com`, three categories of styles bleed into the parent page:

1. **Tailwind preflight** — global resets targeting `html`, `body`, `*`, `::before`, `::after`
2. **`@layer base` rules** — `html { font-family }`, `body { background, color }`, `* { border-color }`
3. **`:root` custom properties** — `--background`, `--foreground`, `--radius`, etc., which can collide with the parent's own CSS variables

## Solution

Add a Vite plugin to `vite.config.ts` that post-processes the final built CSS bundle using a `generateBundle` hook. The plugin runs after all other transforms (Tailwind, PostCSS, import resolution) and wraps the output in a CSS `@scope (#SJVAirMonitorMap)` block.

No changes are required in `sjvair.com`.

## What the Plugin Does

Given the built CSS output, the plugin performs three transformations:

### 1. Extract non-scopeable at-rules

`@keyframes`, `@font-face`, and `@charset` cannot live inside `@scope` per the CSS spec. These are extracted and kept at the top level. `@font-face` declarations in particular must remain global so the browser can load font files referenced by URL.

### 2. Transform `:root` to `:scope`

Within the content that will be wrapped, any rule using `:root` as its selector is rewritten to use `:scope` instead. Inside `@scope (#SJVAirMonitorMap)`, `:scope` refers to `#SJVAirMonitorMap` itself, so CSS custom properties become scoped to the widget container rather than the document root.

### 3. Wrap remaining rules in `@scope (#SJVAirMonitorMap)`

All remaining CSS — style rules, `@layer` blocks, `@media`, `@supports`, Tailwind utilities, base resets — is wrapped in:

```css
@scope (#SJVAirMonitorMap) {
  /* all remaining rules */
}
```

Rules inside `@scope` only match elements that are descendants of `#SJVAirMonitorMap`. Tailwind preflight rules targeting `html`/`body` (ancestors of the widget) simply match nothing and become no-ops.

## Implementation

### File to change

`vite.config.ts` — add an inline Vite plugin after the existing plugins array.

### Plugin sketch

```ts
function cssScope(scopeSelector: string): Plugin {
  return {
    name: "vite-plugin-css-scope",
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "asset" || !chunk.fileName.endsWith(".css")) continue;

        const source = chunk.source as string;
        const nonScopeable: string[] = [];
        const scopeable: string[] = [];

        // Split and categorize rules (regex or PostCSS walk)
        // Transform :root → :scope in scopeable content
        // Reassemble: nonScopeable + @scope { scopeable }

        chunk.source = [
          ...nonScopeable,
          `@scope (${scopeSelector}) {`,
          ...scopeable,
          `}`,
        ].join("\n");
      }
    },
  };
}
```

The actual implementation should use PostCSS (already a transitive dependency via Tailwind) to walk and transform the AST rather than regex, to correctly handle nested at-rules and multi-selector rules containing `:root`.

### At-rules to keep outside `@scope`

- `@keyframes`
- `@font-face`
- `@charset`

`@layer`, `@media`, `@supports`, and `@container` are all permitted inside `@scope` and should be wrapped along with regular style rules.

## Browser Support

`@scope` is supported in:
- Chrome 118+ (released October 2023)
- Firefox 128+ (released July 2024)
- Safari 17.4+ (released March 2024)

This is an acceptable floor for the SJVAir audience.

## Out of Scope

- No changes to `sjvair.com`
- No changes to `app.css`
- No Shadow DOM refactor
- The `.MonitorDetailPanel.css` split chunk should receive the same transformation (it is also loaded globally when the detail panel is rendered)
