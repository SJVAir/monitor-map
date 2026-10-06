# Options Toolbar & Unified Legend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace monitor-map's display-options popover and floating legend cards with a dropdown toolbar (≥768px) / full-screen options panel (<768px) and a single collapsible legend, as designed in the reference demo.

**Architecture:** One set of Svelte components whose layout switches purely via Tailwind `md:`/`max-md:` variants; the only layout-dependent _behavior_ (single- vs. multi-open menus, closing the pollutant dropdown on pick) reads `matchMedia` at click time. All non-trivial logic (group select-all, pollutant URL mapping, basemap variant carry-over, legend math, reset defaults) lives in small pure TypeScript modules covered by Vitest. Menus bind directly to the existing integration singletons' `$state` fields.

**Tech Stack:** Svelte 5 (runes, attachments, function bindings), Tailwind CSS v4, `@lucide/svelte`, `@maptiler/sdk`, `color2k`, Vitest 5.

**Spec:** `docs/superpowers/specs/2026-10-05-options-toolbar-legend-design.md`

## Global Constraints

- Tabs for indentation, double quotes, no trailing commas, print width 100 — run `npm run format` before each commit.
- Tailwind utilities over `<style>` blocks; `class:` cannot take bracketed/colon Tailwind classes — use class arrays/strings.
- Never give a component and a `.svelte.ts` module the same base name in one folder. Import **new** rune modules with the `.svelte.js` extension (e.g. `./options-state.svelte.js`); leave existing imports as they are.
- Wide/narrow breakpoint is Tailwind's default `md` = `48rem` (768px). `WIDE_LAYOUT_QUERY` must stay `"(min-width: 48rem)"`.
- No Font Awesome, no dark mode, no new runtime dependencies (Vitest is a devDependency only).
- Git commits: **no** `Co-Authored-By` or any AI attribution trailer. **Never commit `.md` files** (the user commits docs manually) — this includes this plan, the spec and `CLAUDE.md`.
- Never create a release, run `npm publish`, or bump to 4.0.0 as part of this plan — the 4.0.0 version bump and release happen later, only with the user's explicit approval.
- Pure modules under test must not import (value imports) anything that pulls in `@maptiler/sdk` or Svelte runes; `import type` is fine.

## Review Focus

1. **A monitors/EV layer re-appearing after being turned off.** The 2-minute monitor refresh (and EV data arrival) re-runs constructor effects that call `apply()`. Expected: with Pollutant = None (or EV unchecked) the layer stays off across refreshes. Pinned by the guard code + manual check in Task 5, Step 6.
2. **`?pollutant=` values other than `pm25`/`o3`/`none`** (e.g. `PM25`, empty, `1`). Expected: ignored — the map falls back to the meta default and the URL is rewritten to the active selection. Pinned by `parsePollutantParam` tests in Task 3.
3. **A monitor group with no rows for the current pollutant** (e.g. Low-cost under Ozone if only VOZbox applies, or none apply). Expected: rows that don't apply are hidden; a group with zero applicable rows is hidden entirely and select-all never touches hidden rows. Pinned by `groupState([])`/`typeSupportsPollutant` tests in Task 2.
4. **Switching to a basemap that lacks the current Theme** (e.g. Dark → Toner). Expected: falls back to that basemap's default variant, never errors or leaves the Theme list with nothing selected. Pinned by `variantForStyle` tests in Task 4.
5. **Metadata with an unusual number of levels** (ozone's 5 with no Moderate, a single level, or none). Expected: legend renders valid CSS and correctly positioned ticks; zero levels hides the pollutant section. Pinned by `pollutantLegendSection`/`gradientBackground` tests in Task 1.

---

## File Structure

```
vitest.config.ts                                   NEW  Vitest config ($lib alias, tests/**)
tests/legend/legend-data.test.ts                   NEW
tests/options/group-state.test.ts                  NEW
tests/monitors/monitor-groups.test.ts              NEW
tests/options/pollutant-param.test.ts              NEW
tests/map/basemap.test.ts                          NEW
tests/options/map-option-defaults.test.ts          NEW

src/lib/legend/legend-data.ts                      NEW  pure: legend section builders + CSS math
src/lib/legend/LegendBar.svelte                    NEW  one bar + labels
src/lib/legend/Legend.svelte                       NEW  collapsible card of sections

src/lib/options/group-state.ts                     NEW  pure: select-all state
src/lib/options/pollutant-param.ts                 NEW  pure: ?pollutant= <-> selection
src/lib/options/map-option-defaults.ts             NEW  pure: defaults table + apply
src/lib/options/reset-map-options.ts               NEW  wires defaults to the singletons
src/lib/options/layout.ts                          NEW  isWideLayout()
src/lib/options/options-state.svelte.ts            NEW  which menus are open (context)
src/lib/options/OptionsBar.svelte                  NEW  toolbar / full-screen panel container
src/lib/options/OptionsGroup.svelte                NEW  joined button cluster
src/lib/options/OptionsMenu.svelte                 NEW  one dropdown / panel section
src/lib/options/rows/CheckboxRow.svelte            NEW
src/lib/options/rows/RadioRow.svelte               NEW
src/lib/options/rows/SubmenuRow.svelte             NEW
src/lib/options/rows/GroupRow.svelte               NEW
src/lib/options/rows/MarkerIcon.svelte             NEW  renders a MapImageIcon
src/lib/options/menus/PollutantMenu.svelte         NEW
src/lib/options/menus/MonitorsMenu.svelte          NEW
src/lib/options/menus/LayersMenu.svelte            NEW
src/lib/options/menus/OverlaysMenu.svelte          NEW
src/lib/options/menus/SettingsMenu.svelte          NEW

src/lib/monitors/monitor-groups.ts                 NEW  pure: group membership + pollutant support
src/lib/map/basemap.ts                             NEW  pure: variantForStyle()
src/lib/map/map-style-state.svelte.ts              NEW  shared basemap/theme state

src/lib/monitors/monitors-map-integration.svelte.ts  MOD  vendor split, enabled guards
src/lib/ev-stations/ev-stations-map-integration.svelte.ts MOD defaults, enabled guards
src/lib/hms/hms-fire-icon-manager.ts               MOD  export tiers + legend categories
src/lib/hms/hms-smoke-map-integration.svelte.ts    MOD  export density styles
src/lib/map/MapShell.svelte                        MOD  OptionsBar + search snippet
src/lib/search/Search.svelte                       MOD  toolbar-sized styling
src/lib/MonitorMapLayout.svelte                    MOD  new menus, legend, URL sync
src/lib/index.ts                                   MOD  exports
package.json, tsconfig.json                        MOD  vitest script/dep, include tests

DELETE: src/lib/map/Menu.svelte, src/lib/map/MapStyleDisplayOptions.svelte,
        src/lib/components/DisplayOption.svelte, src/lib/components/MapLayersDisplayOptions.svelte,
        src/lib/components/SegmentedControl.svelte, src/lib/components/ToggleSwitch.svelte,
        src/lib/monitors/components/MonitorsDisplayOptions.svelte,
        src/lib/monitors/components/MonitorMarkersLegend.svelte,
        src/lib/ev-stations/components/EvStationsDisplayOptions.svelte,
        src/lib/hms/components/HMSFireLegend.svelte, src/lib/MapLegend.svelte
```

**Deviations from the spec's file list (same behavior, better boundaries):**

- `PollutantLegend.svelte` / `FireSmokeLegend.svelte` become pure builder functions in `legend-data.ts` (`pollutantLegendSection`, `fireSmokeLegendSections`) feeding one `Legend` component — this makes the "hide the card when nothing has content" rule trivial and testable.
- `basemap.ts` lives in `src/lib/map/` next to the new `map-style-state.svelte.ts` (basemap state must be shared so Reset can change it).
- `reset.ts` is split into pure `map-option-defaults.ts` (tested) and `reset-map-options.ts` (wiring).

---

### Task 1: Vitest setup + legend data module

**Files:**

- Create: `vitest.config.ts`, `src/lib/legend/legend-data.ts`, `tests/legend/legend-data.test.ts`
- Modify: `package.json` (scripts + devDependency), `tsconfig.json` (`include`)

**Interfaces:**

- Produces (used by Tasks 5, 7, 9):
  - `interface LegendCategory { color: string; label?: string }`
  - `type LegendBarData = { kind: "gradient"; colors: Array<string>; ticks: Array<string> } | { kind: "blocks"; categories: Array<LegendCategory>; breakpoints?: Array<string> }`
  - `interface LegendSection { id: string; title: string; unit?: string; bar: LegendBarData }`
  - `interface SmokeDensityStyle { label: string; color: string; opacity: number }`
  - `pollutantLegendSection(pollutant: MonitorsPollutant, levels: ReadonlyArray<Pick<SJVAirEntryLevel, "color" | "range">>): LegendSection | null`
  - `fireSmokeLegendSections(fireTiers: ReadonlyArray<LegendCategory>, smoke: ReadonlyArray<SmokeDensityStyle>): Array<LegendSection>`
  - `swatchOverWhite(color: string, opacity: number): string`
  - `gradientBackground(colors: ReadonlyArray<string>): string`
  - `blocksBackground(colors: ReadonlyArray<string>): string`
  - `tickPosition(index: number, count: number): number` (percent 0–100)

- [ ] **Step 1: Install Vitest and wire config**

Run: `npm install --save-dev vitest@^5.0.3`

Add to `package.json` `"scripts"` (after `"lint"`):

```json
		"test": "vitest run"
```

Create `vitest.config.ts`:

```ts
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
```

In `tsconfig.json` change `"include"` to:

```json
	"include": ["src/**/*.ts", "src/**/*.svelte", "tests/**/*.ts", "vite.config.ts", "vitest.config.ts"],
```

- [ ] **Step 2: Write the failing tests**

Create `tests/legend/legend-data.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseToRgba } from "color2k";
import {
	blocksBackground,
	fireSmokeLegendSections,
	gradientBackground,
	pollutantLegendSection,
	swatchOverWhite,
	tickPosition
} from "$lib/legend/legend-data";

const level = (color: string, start: number, end: number) => ({
	color,
	range: [start, end] as [number, number]
});

describe("pollutantLegendSection", () => {
	it("builds a PM2.5 gradient with floored range starts as ticks", () => {
		const section = pollutantLegendSection("pm25", [
			level("#00e400", 0, 9),
			level("#ffff00", 9.1, 35.4),
			level("#ff7e00", 35.5, 55.4),
			level("#ff0000", 55.5, 150.4),
			level("#8f3f97", 150.5, 250.4),
			level("#7e0023", 250.5, 500.4)
		]);
		expect(section).toEqual({
			id: "pollutant",
			title: "PM2.5",
			unit: "µg/m³",
			bar: {
				kind: "gradient",
				colors: ["#00e400", "#ffff00", "#ff7e00", "#ff0000", "#8f3f97", "#7e0023"],
				ticks: ["0", "9", "35", "55", "150", "250"]
			}
		});
	});

	it("handles ozone's five levels with no Moderate", () => {
		const section = pollutantLegendSection("o3", [
			level("#00e400", 0, 124.9),
			level("#ff7e00", 125, 164.9),
			level("#ff0000", 165, 204.9),
			level("#8f3f97", 205, 404.9),
			level("#7e0023", 405, 604.9)
		]);
		expect(section?.title).toBe("Ozone");
		expect(section?.unit).toBe("ppb");
		expect(section?.bar).toEqual({
			kind: "gradient",
			colors: ["#00e400", "#ff7e00", "#ff0000", "#8f3f97", "#7e0023"],
			ticks: ["0", "125", "165", "205", "405"]
		});
	});

	it("returns null when there are no levels", () => {
		expect(pollutantLegendSection("pm25", [])).toBeNull();
	});
});

describe("gradientBackground", () => {
	it("joins colors into a left-to-right gradient", () => {
		expect(gradientBackground(["red", "lime", "blue"])).toBe(
			"linear-gradient(to right, red, lime, blue)"
		);
	});

	it("returns a plain color for a single stop (a 1-stop linear-gradient is invalid CSS)", () => {
		expect(gradientBackground(["red"])).toBe("red");
	});

	it("returns none for no colors", () => {
		expect(gradientBackground([])).toBe("none");
	});
});

describe("blocksBackground", () => {
	it("builds hard-edged equal-width blocks", () => {
		expect(blocksBackground(["red", "blue"])).toBe(
			"linear-gradient(to right, red 0.00%, red 50.00%, blue 50.00%, blue 100.00%)"
		);
	});

	it("returns none for no colors", () => {
		expect(blocksBackground([])).toBe("none");
	});
});

describe("tickPosition", () => {
	it("spreads ticks evenly from 0 to 100 percent", () => {
		expect(tickPosition(0, 6)).toBe(0);
		expect(tickPosition(5, 6)).toBe(100);
		expect(tickPosition(2, 5)).toBe(50);
	});

	it("puts a lone tick at 0", () => {
		expect(tickPosition(0, 1)).toBe(0);
	});
});

describe("swatchOverWhite", () => {
	it("mixes a color toward white by its layer opacity", () => {
		expect(parseToRgba(swatchOverWhite("#000000", 0.4))).toEqual([153, 153, 153, 1]);
	});

	it("is white at zero opacity", () => {
		expect(parseToRgba(swatchOverWhite("#000000", 0))).toEqual([255, 255, 255, 1]);
	});
});

describe("fireSmokeLegendSections", () => {
	it("builds a Fire section and a Smoke Density section with blended swatches", () => {
		const sections = fireSmokeLegendSections(
			[
				{ color: "#FFD700", label: "<10" },
				{ color: "#8B0000", label: "≥350" }
			],
			[{ label: "Heavy", color: "#000000", opacity: 0.4 }]
		);
		expect(sections.map((s) => s.id)).toEqual(["fire", "smoke"]);
		expect(sections[0]).toEqual({
			id: "fire",
			title: "Fire",
			unit: "MW",
			bar: {
				kind: "blocks",
				categories: [
					{ color: "#FFD700", label: "<10" },
					{ color: "#8B0000", label: "≥350" }
				]
			}
		});
		const smoke = sections[1].bar;
		expect(smoke.kind).toBe("blocks");
		if (smoke.kind !== "blocks") return;
		expect(smoke.categories[0].label).toBe("Heavy");
		expect(parseToRgba(smoke.categories[0].color)).toEqual([153, 153, 153, 1]);
	});
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "$lib/legend/legend-data"`.

- [ ] **Step 4: Implement `src/lib/legend/legend-data.ts`**

```ts
import type { SJVAirEntryLevel } from "@sjvair/sdk";
import { mix } from "color2k";
import type { MonitorsPollutant } from "$lib/monitors/types";

export interface LegendCategory {
	color: string;
	label?: string;
}

export type LegendBarData =
	| { kind: "gradient"; colors: Array<string>; ticks: Array<string> }
	| { kind: "blocks"; categories: Array<LegendCategory>; breakpoints?: Array<string> };

export interface LegendSection {
	id: string;
	title: string;
	unit?: string;
	bar: LegendBarData;
}

export interface SmokeDensityStyle {
	label: string;
	color: string;
	opacity: number;
}

const POLLUTANT_TITLES: Record<MonitorsPollutant, { title: string; unit: string }> = {
	pm25: { title: "PM2.5", unit: "µg/m³" },
	o3: { title: "Ozone", unit: "ppb" }
};

/**
 * Pollutant legend built from the monitors meta levels — the same levels the map markers are
 * colored by, so the two can never disagree. One tick per level, at that level's color stop.
 */
export function pollutantLegendSection(
	pollutant: MonitorsPollutant,
	levels: ReadonlyArray<Pick<SJVAirEntryLevel, "color" | "range">>
): LegendSection | null {
	if (levels.length === 0) return null;
	return {
		id: "pollutant",
		...POLLUTANT_TITLES[pollutant],
		bar: {
			kind: "gradient",
			colors: levels.map((level) => level.color),
			ticks: levels.map((level) => String(Math.floor(level.range[0])))
		}
	};
}

/** Fire & Smoke share one toggle, so they render as two independent bars. */
export function fireSmokeLegendSections(
	fireTiers: ReadonlyArray<LegendCategory>,
	smoke: ReadonlyArray<SmokeDensityStyle>
): Array<LegendSection> {
	return [
		{ id: "fire", title: "Fire", unit: "MW", bar: { kind: "blocks", categories: [...fireTiers] } },
		{
			id: "smoke",
			title: "Smoke Density",
			bar: {
				kind: "blocks",
				categories: smoke.map(({ label, color, opacity }) => ({
					label,
					color: swatchOverWhite(color, opacity)
				}))
			}
		}
	];
}

/** Approximates how a translucent fill layer looks over a light basemap. */
export function swatchOverWhite(color: string, opacity: number): string {
	return mix("#ffffff", color, opacity);
}

export function gradientBackground(colors: ReadonlyArray<string>): string {
	if (colors.length === 0) return "none";
	if (colors.length === 1) return colors[0];
	return `linear-gradient(to right, ${colors.join(", ")})`;
}

/** Hard-edged equal-width blocks: each color repeated at both edges of its own share. */
export function blocksBackground(colors: ReadonlyArray<string>): string {
	const count = colors.length;
	if (count === 0) return "none";
	const stops = colors.map(
		(color, i) => `${color} ${percent(i / count)}, ${color} ${percent((i + 1) / count)}`
	);
	return `linear-gradient(to right, ${stops.join(", ")})`;
}

/** Percent position of the index-th of `count` evenly spaced labels. */
export function tickPosition(index: number, count: number): number {
	return count <= 1 ? 0 : (index / (count - 1)) * 100;
}

function percent(fraction: number): string {
	return `${(fraction * 100).toFixed(2)}%`;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all `legend-data` tests).

- [ ] **Step 6: Type-check, format, commit**

Run: `npm run check && npm run format`
Expected: `svelte-check found 0 errors`.

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts src/lib/legend/legend-data.ts tests/legend/legend-data.test.ts
git commit -m "Add Vitest and legend data helpers"
```

---

### Task 2: Group select-all state + monitor groups

**Files:**

- Create: `src/lib/options/group-state.ts`, `src/lib/monitors/monitor-groups.ts`, `tests/options/group-state.test.ts`, `tests/monitors/monitor-groups.test.ts`

**Interfaces:**

- Produces (used by Task 9):
  - `type GroupState = "checked" | "unchecked" | "indeterminate" | "empty"`
  - `groupState(values: ReadonlyArray<boolean>): GroupState`
  - `setGroup(options: ReadonlyArray<{ value: boolean }>, value: boolean): void`
  - `REFERENCE_GRADE_TYPES = ["airnow", "aqlite", "aqview", "bam1022"] as const`
  - `LOW_COST_TYPES = ["airgradient", "purpleair", "vozbox"] as const`
  - `typeSupportsPollutant(meta: MonitorTypeMeta | null, type: string, pollutant: string | null): boolean`
  - `interface MonitorTypeMeta { monitors: Record<string, { entries: Record<string, unknown> } | undefined> }`

- [ ] **Step 1: Write the failing tests**

`tests/options/group-state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { groupState, setGroup } from "$lib/options/group-state";

describe("groupState", () => {
	it("is checked when every row is on", () => {
		expect(groupState([true, true])).toBe("checked");
	});

	it("is unchecked when every row is off", () => {
		expect(groupState([false, false])).toBe("unchecked");
	});

	it("is indeterminate when some rows are on", () => {
		expect(groupState([true, false, true])).toBe("indeterminate");
	});

	it("is empty when the group has no visible rows", () => {
		expect(groupState([])).toBe("empty");
	});
});

describe("setGroup", () => {
	it("sets only the options it is given", () => {
		const visible = [{ value: false }, { value: true }];
		const hidden = { value: false };
		setGroup(visible, true);
		expect(visible.map((o) => o.value)).toEqual([true, true]);
		expect(hidden.value).toBe(false);
	});
});
```

`tests/monitors/monitor-groups.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
	LOW_COST_TYPES,
	REFERENCE_GRADE_TYPES,
	typeSupportsPollutant
} from "$lib/monitors/monitor-groups";

const meta = {
	monitors: {
		purpleair: { entries: { pm25: {}, temperature: {} } },
		vozbox: { entries: { o3: {} } }
	}
};

describe("monitor groups", () => {
	it("splits types into reference-grade and low-cost by vendor", () => {
		expect([...REFERENCE_GRADE_TYPES]).toEqual(["airnow", "aqlite", "aqview", "bam1022"]);
		expect([...LOW_COST_TYPES]).toEqual(["airgradient", "purpleair", "vozbox"]);
	});
});

describe("typeSupportsPollutant", () => {
	it("is true when the type has an entry for the pollutant", () => {
		expect(typeSupportsPollutant(meta, "purpleair", "pm25")).toBe(true);
		expect(typeSupportsPollutant(meta, "vozbox", "o3")).toBe(true);
	});

	it("is false when the type lacks the pollutant", () => {
		expect(typeSupportsPollutant(meta, "purpleair", "o3")).toBe(false);
	});

	it("is false for unknown types, missing meta, or no pollutant", () => {
		expect(typeSupportsPollutant(meta, "airnow", "pm25")).toBe(false);
		expect(typeSupportsPollutant(null, "purpleair", "pm25")).toBe(false);
		expect(typeSupportsPollutant(meta, "purpleair", null)).toBe(false);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `$lib/options/group-state` and `$lib/monitors/monitor-groups`.

- [ ] **Step 3: Implement**

`src/lib/options/group-state.ts`:

```ts
export type GroupState = "checked" | "unchecked" | "indeterminate" | "empty";

/** Select-all state of a group, computed only from its currently visible rows. */
export function groupState(values: ReadonlyArray<boolean>): GroupState {
	if (values.length === 0) return "empty";
	const checkedCount = values.filter(Boolean).length;
	if (checkedCount === 0) return "unchecked";
	return checkedCount === values.length ? "checked" : "indeterminate";
}

/** Applies a select-all toggle to the given (visible) rows only. */
export function setGroup(options: ReadonlyArray<{ value: boolean }>, value: boolean): void {
	for (const option of options) {
		option.value = value;
	}
}
```

`src/lib/monitors/monitor-groups.ts`:

```ts
/** Monitor display-option keys shown under each Monitors menu group, in display order. */
export const REFERENCE_GRADE_TYPES = ["airnow", "aqlite", "aqview", "bam1022"] as const;
export const LOW_COST_TYPES = ["airgradient", "purpleair", "vozbox"] as const;

export type MonitorGroupType =
	(typeof REFERENCE_GRADE_TYPES)[number] | (typeof LOW_COST_TYPES)[number];

/** The slice of MonitorsMeta needed to know which pollutants a monitor type reports. */
export interface MonitorTypeMeta {
	monitors: Record<string, { entries: Record<string, unknown> } | undefined>;
}

export function typeSupportsPollutant(
	meta: MonitorTypeMeta | null,
	type: string,
	pollutant: string | null
): boolean {
	const deviceMeta = meta?.monitors[type];
	return !!deviceMeta && !!pollutant && pollutant in deviceMeta.entries;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Format and commit**

```bash
npm run format
git add src/lib/options/group-state.ts src/lib/monitors/monitor-groups.ts tests/options/group-state.test.ts tests/monitors/monitor-groups.test.ts
git commit -m "Add monitor group and select-all state helpers"
```

---

### Task 3: Pollutant selection ↔ URL param

**Files:**

- Create: `src/lib/options/pollutant-param.ts`, `tests/options/pollutant-param.test.ts`

**Interfaces:**

- Produces (used by Tasks 6, 9):
  - `type PollutantSelection = MonitorsPollutant | "none"`
  - `parsePollutantParam(value: unknown): PollutantSelection | null`
  - `currentSelection(pollutant: MonitorsPollutant | null, monitorsEnabled: boolean): PollutantSelection | null`
  - `interface PollutantTargets { manager: { pollutant: MonitorsPollutant | null }; integration: { enabled: boolean } }`
  - `applyPollutantSelection(selection: PollutantSelection, targets: PollutantTargets): void`

- [ ] **Step 1: Write the failing tests**

`tests/options/pollutant-param.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
	applyPollutantSelection,
	currentSelection,
	parsePollutantParam
} from "$lib/options/pollutant-param";
import type { MonitorsPollutant } from "$lib/monitors/types";

function targets(pollutant: MonitorsPollutant | null, enabled: boolean) {
	return { manager: { pollutant }, integration: { enabled } };
}

describe("parsePollutantParam", () => {
	it("accepts pm25, o3 and none", () => {
		expect(parsePollutantParam("pm25")).toBe("pm25");
		expect(parsePollutantParam("o3")).toBe("o3");
		expect(parsePollutantParam("none")).toBe("none");
	});

	it("rejects anything else", () => {
		for (const value of ["PM25", "", "ozone", 1, true, undefined, null]) {
			expect(parsePollutantParam(value)).toBeNull();
		}
	});
});

describe("currentSelection", () => {
	it("is the pollutant while monitors are enabled", () => {
		expect(currentSelection("o3", true)).toBe("o3");
	});

	it("is none while monitors are disabled, whatever the pollutant", () => {
		expect(currentSelection("pm25", false)).toBe("none");
		expect(currentSelection(null, false)).toBe("none");
	});

	it("is null before a pollutant is known", () => {
		expect(currentSelection(null, true)).toBeNull();
	});
});

describe("applyPollutantSelection", () => {
	it("none disables monitors and keeps the last pollutant", () => {
		const t = targets("pm25", true);
		applyPollutantSelection("none", t);
		expect(t).toEqual(targets("pm25", false));
	});

	it("a pollutant sets it and re-enables monitors", () => {
		const t = targets("pm25", false);
		applyPollutantSelection("o3", t);
		expect(t).toEqual(targets("o3", true));
	});

	it("round-trips through currentSelection", () => {
		for (const selection of ["pm25", "o3", "none"] as const) {
			const t = targets("pm25", true);
			applyPollutantSelection(selection, t);
			expect(currentSelection(t.manager.pollutant, t.integration.enabled)).toBe(selection);
		}
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `$lib/options/pollutant-param`.

- [ ] **Step 3: Implement `src/lib/options/pollutant-param.ts`**

```ts
import type { MonitorsPollutant } from "$lib/monitors/types";

/**
 * What the Pollutant menu shows. "none" is not a monitorsManager.pollutant value — it means
 * the monitors integration is disabled while the manager keeps its last real pollutant.
 */
export type PollutantSelection = MonitorsPollutant | "none";

export interface PollutantTargets {
	manager: { pollutant: MonitorsPollutant | null };
	integration: { enabled: boolean };
}

export function parsePollutantParam(value: unknown): PollutantSelection | null {
	return value === "pm25" || value === "o3" || value === "none" ? value : null;
}

export function currentSelection(
	pollutant: MonitorsPollutant | null,
	monitorsEnabled: boolean
): PollutantSelection | null {
	return monitorsEnabled ? pollutant : "none";
}

export function applyPollutantSelection(
	selection: PollutantSelection,
	targets: PollutantTargets
): void {
	if (selection === "none") {
		targets.integration.enabled = false;
		return;
	}
	targets.manager.pollutant = selection;
	targets.integration.enabled = true;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Format and commit**

```bash
npm run format
git add src/lib/options/pollutant-param.ts tests/options/pollutant-param.test.ts
git commit -m "Add pollutant selection and URL param mapping"
```

---

### Task 4: Basemap variant carry-over + shared map style state

**Files:**

- Create: `src/lib/map/basemap.ts`, `src/lib/map/map-style-state.svelte.ts`, `tests/map/basemap.test.ts`

**Interfaces:**

- Produces (used by Tasks 6, 9):
  - `variantForStyle<V extends StyleVariantLike>(style: ReferenceStyleLike<V>, previous: StyleVariantLike | null): V`
  - `mapStyleState` (singleton) with `referenceStyle: ReferenceMapStyle`, `variant: MapStyleVariant`, `selectReferenceStyle(style: ReferenceMapStyle): void`, `selectVariant(variant: MapStyleVariant): void`, `reset(): void`
- Replaces the logic currently in `src/lib/map/MapStyleDisplayOptions.svelte` (deleted in Task 10).

- [ ] **Step 1: Write the failing test**

`tests/map/basemap.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { variantForStyle } from "$lib/map/basemap";

function fakeStyle(types: Array<string>) {
	const variants = new Map(types.map((type) => [type, { getType: () => type }]));
	return {
		variants,
		hasVariant: (type: string) => variants.has(type),
		getVariant: (type: string) => variants.get(type)!,
		getDefaultVariant: () => variants.get("DEFAULT")!
	};
}

describe("variantForStyle", () => {
	it("keeps the same variant type when the new basemap has it", () => {
		const style = fakeStyle(["DEFAULT", "DARK", "PASTEL"]);
		expect(variantForStyle(style, { getType: () => "DARK" })).toBe(style.variants.get("DARK"));
	});

	it("falls back to the default variant when the new basemap lacks it", () => {
		const toner = fakeStyle(["DEFAULT", "LITE", "LINES"]);
		expect(variantForStyle(toner, { getType: () => "DARK" })).toBe(toner.variants.get("DEFAULT"));
	});

	it("uses the default variant when there is no previous variant", () => {
		const style = fakeStyle(["DEFAULT", "DARK"]);
		expect(variantForStyle(style, null)).toBe(style.variants.get("DEFAULT"));
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `$lib/map/basemap`.

- [ ] **Step 3: Implement `src/lib/map/basemap.ts`**

```ts
/** The slices of MapTiler's MapStyleVariant / ReferenceMapStyle this module needs. */
export interface StyleVariantLike {
	getType(): string;
}

export interface ReferenceStyleLike<V extends StyleVariantLike> {
	hasVariant(type: string): boolean;
	getVariant(type: string): V;
	getDefaultVariant(): V;
}

/**
 * Variant to show after switching basemaps: the same variant type (e.g. "DARK") when the new
 * basemap offers it, otherwise the new basemap's default.
 */
export function variantForStyle<V extends StyleVariantLike>(
	style: ReferenceStyleLike<V>,
	previous: StyleVariantLike | null
): V {
	if (previous && style.hasVariant(previous.getType())) {
		return style.getVariant(previous.getType());
	}
	return style.getDefaultVariant();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Implement `src/lib/map/map-style-state.svelte.ts`**

```ts
import type { MapStyleVariant, ReferenceMapStyle } from "@maptiler/sdk";
import { DefaultMapStyle, mapManager } from "./map.svelte";
import { integrationsManager } from "./integrations/integrations-manager";
import { variantForStyle } from "./basemap";

/** Basemap + theme selection, shared so the Settings menu and Reset Map Options agree. */
class MapStyleState {
	referenceStyle: ReferenceMapStyle = $state.raw(DefaultMapStyle.getReferenceStyle());
	variant: MapStyleVariant = $state.raw(DefaultMapStyle);
	private applied: MapStyleVariant = DefaultMapStyle;

	selectReferenceStyle(style: ReferenceMapStyle): void {
		this.referenceStyle = style;
		this.selectVariant(variantForStyle(style, this.variant));
	}

	selectVariant(variant: MapStyleVariant): void {
		this.variant = variant;
		this.apply();
	}

	reset(): void {
		this.referenceStyle = DefaultMapStyle.getReferenceStyle();
		this.selectVariant(DefaultMapStyle);
	}

	private apply(): void {
		const map = mapManager.map;
		if (!map || this.variant === this.applied) return;
		this.applied = this.variant;
		// setStyle wipes every custom source/layer; re-add enabled integrations once it loads.
		map.once("style.load", () => integrationsManager.refresh());
		map.setStyle(this.variant);
	}
}

export const mapStyleState = new MapStyleState();
export type { MapStyleState };
```

- [ ] **Step 6: Type-check, format, commit**

Run: `npm run check && npm run format`
Expected: 0 errors.

```bash
git add src/lib/map/basemap.ts src/lib/map/map-style-state.svelte.ts tests/map/basemap.test.ts
git commit -m "Add shared basemap state with theme carry-over"
```

---

### Task 5: Integration changes (vendor split, enabled guards, legend constants)

**Files:**

- Modify: `src/lib/monitors/monitors-map-integration.svelte.ts`
- Modify: `src/lib/collocation-sites/collocations-map-integration.svelte.ts`
- Modify: `src/lib/ev-stations/ev-stations-map-integration.svelte.ts`
- Modify: `src/lib/hms/hms-fire-icon-manager.ts`
- Modify: `src/lib/hms/hms-smoke-map-integration.svelte.ts`

**Interfaces:**

- Consumes: `LegendCategory`, `SmokeDensityStyle` types (Task 1).
- Produces:
  - `monitorsMapIntegration.displayOptions` keys: `purpleair, airgradient, aqview, bam1022, airnow, vozbox, aqlite, inactive, inside` (no `sjvair`).
  - `evStationsMapIntegration.enabled` defaults `false`; `displayOptions.lvl2/lvl3` default `true`.
  - `collocationSitesMapIntegration.available: boolean` (monitors enabled **and** pollutant is PM2.5); the layer exists only while `enabled && available`.
  - `FIRE_LEGEND_CATEGORIES: Array<LegendCategory>` from `hms-fire-icon-manager.ts`.
  - `SMOKE_DENSITY_STYLES` and `SMOKE_LEGEND: Array<SmokeDensityStyle>` from `hms-smoke-map-integration.svelte.ts`.

- [ ] **Step 1: Monitors — vendor split**

In `monitors-map-integration.svelte.ts`, replace the `filters` const (lines 20–30) with:

```ts
const filters = {
	monitor(deviceType: MonitorType): ExpressionSpecification {
		return ["==", ["get", "type"], deviceType];
	}
};
```

Replace `displayOptions` (lines 41–51) with:

```ts
displayOptions = $derived.by(() => ({
	airnow: new MapDisplayOption("AirNow", true, this.icons.get("outside-display-triangle")),
	aqlite: new MapDisplayOption("AQLite", true, this.icons.get("outside-display-triangle")),
	aqview: new MapDisplayOption("AQview", true, this.icons.get("outside-display-triangle")),
	bam1022: new MapDisplayOption("SJVAir", true, this.icons.get("outside-display-triangle")),
	airgradient: new MapDisplayOption("AirGradient", true, this.icons.get("outside-display-circle")),
	purpleair: new MapDisplayOption("PurpleAir", true, this.icons.get("outside-display-square")),
	vozbox: new MapDisplayOption("VOZbox", true, this.icons.get("outside-display-circle")),
	inactive: new MapDisplayOption("Inactive", false, this.icons.get("outside-default-square")),
	inside: new MapDisplayOption("Inside", false, this.icons.get("inside-display-square"))
}));
```

In `filters` derived, replace the per-type pushes (lines 118–125) with:

```ts
if (this.displayOptions.airnow.value) monitorFilters.push(filters.monitor("airnow"));
if (this.displayOptions.aqlite.value) monitorFilters.push(filters.monitor("aqlite"));
if (this.displayOptions.aqview.value) monitorFilters.push(filters.monitor("aqview"));
if (this.displayOptions.bam1022.value) monitorFilters.push(filters.monitor("bam1022"));
if (this.displayOptions.airgradient.value) monitorFilters.push(filters.monitor("airgradient"));
if (this.displayOptions.purpleair.value) monitorFilters.push(filters.monitor("purpleair"));
if (this.displayOptions.vozbox.value) monitorFilters.push(filters.monitor("vozbox"));
```

In `featuresByType`, update the comment above it to:

```ts
// Groups features by monitor type for per-type cluster sources, applying display option
// filters so cluster aggregates only include visible monitors. SJVAir-owned purpleair is
// clustered with "airgradient" since they share the same shape (circle); its visibility still
// follows the PurpleAir option.
```

and replace `typeVisible` with:

```ts
const typeVisible: Partial<Record<MonitorType, boolean>> = {
	airnow: opts.airnow.value,
	aqlite: opts.aqlite.value,
	aqview: opts.aqview.value,
	bam1022: opts.bam1022.value,
	airgradient: opts.airgradient.value,
	purpleair: opts.purpleair.value,
	vozbox: opts.vozbox.value
};
```

- [ ] **Step 2: Monitors — keep disabled layers off**

In the constructor's `$effect.root`, add `if (!untrack(() => this.enabled)) return;` as the **first** line inside each of these five effects: "Push filter changes", "Sync unclustered source data", "Keep cluster source data in sync", "Push updated icon expressions", "Re-apply when clustered mode switches". Above the first one add:

```ts
// Every effect below early-returns while disabled (Pollutant = None) so a data refresh
// can't re-add the layer. `enabled` is read untracked: the base class's own effect
// already applies/removes on enabled changes, and tracking it here would apply twice.
```

Example — the re-apply effect becomes:

```ts
$effect(() => {
	if (!untrack(() => this.enabled)) return;
	void this.clustered;
	const hasFeatures = Object.keys(this.featuresByType).length > 0;
	if (!untrack(() => mapManager.map) || !hasFeatures) return;
	untrack(() => this.apply());
});
```

In `remove()`, add `this.tooltipManager.disable();` as the first line.

- [ ] **Step 3: Collocation sites — remove the layer while unavailable**

Collocation sites are PM2.5 reference monitors, so the layer only makes sense while monitors are
shown with PM2.5. The integration already removes itself under Ozone; extend that to Pollutant =
None, and make sure nothing re-adds it while unavailable. The user's checkbox (`enabled`) is left
untouched so the sites come back when PM2.5 is picked again.

In `collocations-map-integration.svelte.ts`, add after the `tooltipManager` field:

```ts
	/** The option only applies while monitors are shown with PM2.5. */
	get available(): boolean {
		return monitorsMapIntegration.enabled && monitorsManager.pollutant === "pm25";
	}
```

Replace the second constructor effect

```ts
$effect(() => {
	if (monitorsManager.pollutant === "o3") {
		untrack(() => this.remove());
	} else if (untrack(() => this.enabled)) {
		untrack(() => this.apply());
	}
});
```

with

```ts
// Remove the layer while the option is unavailable (Ozone or Pollutant = None); restore
// it when it becomes available again if the user still has it checked.
$effect(() => {
	if (!this.available) {
		untrack(() => this.remove());
	} else if (untrack(() => this.enabled)) {
		untrack(() => this.apply());
	}
});
```

In `apply()`, add as the first lines (this also covers `integrationsManager.refresh()` after a
basemap change, which applies every enabled integration):

```ts
if (!this.available) {
	this.remove();
	return;
}
```

and add a `remove()` override after `apply()`:

```ts
	remove() {
		this.tooltipManager.disable();
		super.remove();
	}
```

- [ ] **Step 4: EV — defaults and guards**

In `ev-stations-map-integration.svelte.ts`:

```ts
enabled: boolean = $state(false);
```

```ts
displayOptions = $derived.by(() => ({
	lvl2: new MapDisplayOption("Level 2", true, this.icons.get("ev-station-lvl2")!),
	lvl3: new MapDisplayOption("Level 3", true, this.icons.get("ev-station-lvl3")!)
}));
```

Change the two lazy-fetch effects to require the integration to be on:

```ts
// Lazy-fetch level data only once the integration is enabled and the level is on
$effect(() => {
	if (
		this.enabled &&
		this.displayOptions.lvl2.value &&
		evStationsManager.lvl2Stations === undefined
	) {
		evStationsManager.loadLvl2Stations();
	}
});

$effect(() => {
	if (
		this.enabled &&
		this.displayOptions.lvl3.value &&
		evStationsManager.lvl3Stations === undefined
	) {
		evStationsManager.loadLvl3Stations();
	}
});
```

Add `if (!untrack(() => this.enabled)) return;` as the first line of the "Push filter changes", "Sync unclustered source", "Sync clustered sources" and "Re-apply when clustered mode switches" effects (same reason/comment as Step 2).

- [ ] **Step 5: HMS legend constants**

In `hms-fire-icon-manager.ts`, change the tier type/const to exported and add labels + legend categories after `FRP_TIERS`:

```ts
export type FRPTier = "sm" | "md" | "lg" | "xl" | "xxl";

export const FRP_TIERS: Record<FRPTier, { color: string; size: number }> = {
	sm: { color: "#FFD700", size: 20 },
	md: { color: "#FF8C00", size: 24 },
	lg: { color: "#FF4500", size: 28 },
	xl: { color: "#DC143C", size: 32 },
	xxl: { color: "#8B0000", size: 36 }
};

const FRP_TIER_LABELS: Record<FRPTier, string> = {
	sm: "<10",
	md: "10-49",
	lg: "50-149",
	xl: "150-349",
	xxl: "≥350"
};

/** Fire legend blocks (MW), in tier order, using the same colors as the map icons. */
export const FIRE_LEGEND_CATEGORIES: Array<LegendCategory> = (
	Object.keys(FRP_TIERS) as Array<FRPTier>
).map((tier) => ({ color: FRP_TIERS[tier].color, label: FRP_TIER_LABELS[tier] }));
```

with `import type { LegendCategory } from "$lib/legend/legend-data";` at the top.

In `hms-smoke-map-integration.svelte.ts`, add after the imports (plus `import type { SmokeDensityStyle } from "$lib/legend/legend-data";`):

```ts
/** Smoke fill styles, shared by the map layer and the legend so they can't drift apart. */
export const SMOKE_DENSITY_STYLES = {
	light: { label: "Light", color: "#bfc8c3", opacity: 0.2 },
	medium: { label: "Medium", color: "#757b78", opacity: 0.3 },
	heavy: { label: "Heavy", color: "#333634", opacity: 0.4 }
} satisfies Record<string, SmokeDensityStyle>;

export const SMOKE_LEGEND: Array<SmokeDensityStyle> = Object.values(SMOKE_DENSITY_STYLES);
```

and replace the layer `paint` with:

```ts
			paint: {
				"fill-color": [
					"match",
					["get", "density"],
					"light",
					SMOKE_DENSITY_STYLES.light.color,
					"medium",
					SMOKE_DENSITY_STYLES.medium.color,
					SMOKE_DENSITY_STYLES.heavy.color
				],
				"fill-opacity": [
					"match",
					["get", "density"],
					"light",
					SMOKE_DENSITY_STYLES.light.opacity,
					"medium",
					SMOKE_DENSITY_STYLES.medium.opacity,
					SMOKE_DENSITY_STYLES.heavy.opacity
				],
				"fill-outline-color": [
					"match",
					["get", "density"],
					"light",
					SMOKE_DENSITY_STYLES.light.color,
					"medium",
					SMOKE_DENSITY_STYLES.medium.color,
					SMOKE_DENSITY_STYLES.heavy.color
				]
			}
```

- [ ] **Step 6: Fix the one remaining `sjvair` reference**

`src/lib/monitors/components/MonitorsDisplayOptions.svelte` (deleted in Task 10) still references the old key via `sjvairUnderlyingTypes`. Until then, in that file replace the filter callback body's `if (key === "sjvair") return sjvairUnderlyingTypes.some(pollutantSupportedByType);` line by deleting it and delete the `sjvairUnderlyingTypes` const and its comment, so the old menu keeps compiling.

Run: `npm run check && npm test`
Expected: 0 errors; tests PASS.

- [ ] **Step 7: Manual check (Review Focus #1)**

Run: `npm run dev`, open the printed URL.

- Toggle off every monitor type except PurpleAir in the old menu: SJVAir-owned PurpleAirs (circles) **and** regular PurpleAirs (squares) are both visible; AirGradient sensors are hidden. Toggle AirGradient on: they appear.
- In the browser console run `(await import("/src/lib/monitors/monitors-map-integration.svelte.ts")).monitorsMapIntegration.enabled = false`, then `(await import("/src/lib/monitors/monitors.svelte.ts")).monitorsManager.update()`: markers disappear and stay gone after the update resolves.
- EV stations are not shown on load and the Network tab shows **no** request to `developer.nlr.gov`.
- Turn Collocation Sites on (PM2.5), then in the console set `monitorsMapIntegration.enabled = false`: the crosshairs disappear; set it back to `true`: they return. Switch the basemap in the old Map Styles menu while on Ozone with Collocation Sites checked: no crosshairs appear.

- [ ] **Step 8: Format and commit**

```bash
npm run format
git add src/lib/monitors/monitors-map-integration.svelte.ts src/lib/collocation-sites/collocations-map-integration.svelte.ts src/lib/ev-stations/ev-stations-map-integration.svelte.ts src/lib/hms/hms-fire-icon-manager.ts src/lib/hms/hms-smoke-map-integration.svelte.ts src/lib/monitors/components/MonitorsDisplayOptions.svelte
git commit -m "Split monitor display options by vendor and keep disabled layers off"
```

---

### Task 6: Map option defaults + Reset

**Files:**

- Create: `src/lib/options/map-option-defaults.ts`, `src/lib/options/reset-map-options.ts`, `tests/options/map-option-defaults.test.ts`

**Interfaces:**

- Consumes: `applyPollutantSelection`, `PollutantTargets` (Task 3); `mapStyleState` (Task 4); integration singletons (Task 5 shapes).
- Produces (used by Task 9): `MAP_OPTION_DEFAULTS`, `applyMapOptionDefaults(targets: MapOptionTargets, defaultPollutant: MonitorsPollutant | null): void`, `resetMapOptions(): void`.

- [ ] **Step 1: Write the failing test**

`tests/options/map-option-defaults.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { applyMapOptionDefaults, type MapOptionTargets } from "$lib/options/map-option-defaults";

function flippedTargets(): MapOptionTargets {
	const opt = (value: boolean) => ({ value });
	return {
		manager: { pollutant: "o3" },
		integration: {
			enabled: false,
			clustered: false,
			displayOptions: {
				airnow: opt(false),
				aqlite: opt(false),
				aqview: opt(false),
				bam1022: opt(false),
				airgradient: opt(false),
				purpleair: opt(false),
				vozbox: opt(false),
				inactive: opt(true),
				inside: opt(true)
			}
		},
		collocationSites: { enabled: true },
		hmsFire: { enabled: false },
		hmsSmoke: { enabled: false },
		evStations: {
			enabled: true,
			clustered: false,
			displayOptions: { lvl2: opt(false), lvl3: opt(false) }
		},
		wind: { enabled: true },
		mapStyle: { reset: vi.fn() }
	};
}

describe("applyMapOptionDefaults", () => {
	it("restores every option to its default", () => {
		const t = flippedTargets();
		applyMapOptionDefaults(t, "pm25");

		expect(t.manager.pollutant).toBe("pm25");
		expect(t.integration.enabled).toBe(true);
		expect(t.integration.clustered).toBe(true);
		const values = Object.fromEntries(
			Object.entries(t.integration.displayOptions).map(([key, o]) => [key, o.value])
		);
		expect(values).toEqual({
			airnow: true,
			aqlite: true,
			aqview: true,
			bam1022: true,
			airgradient: true,
			purpleair: true,
			vozbox: true,
			inactive: false,
			inside: false
		});
		expect(t.collocationSites.enabled).toBe(false);
		expect(t.hmsFire.enabled).toBe(true);
		expect(t.hmsSmoke.enabled).toBe(true);
		expect(t.evStations.enabled).toBe(false);
		expect(t.evStations.clustered).toBe(true);
		expect(t.evStations.displayOptions.lvl2.value).toBe(true);
		expect(t.evStations.displayOptions.lvl3.value).toBe(true);
		expect(t.wind.enabled).toBe(false);
		expect(t.mapStyle.reset).toHaveBeenCalledOnce();
	});

	it("re-enables monitors without changing the pollutant when meta isn't loaded", () => {
		const t = flippedTargets();
		applyMapOptionDefaults(t, null);
		expect(t.manager.pollutant).toBe("o3");
		expect(t.integration.enabled).toBe(true);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `$lib/options/map-option-defaults`.

- [ ] **Step 3: Implement `src/lib/options/map-option-defaults.ts`**

```ts
import type { MonitorsPollutant } from "$lib/monitors/types";
import { applyPollutantSelection, type PollutantTargets } from "./pollutant-param";

/**
 * Defaults restored by "Reset Map Options". Keep in sync with the constructor defaults in each
 * integration (monitors/EV display options, `enabled`, `clustered`) so a reset matches a fresh load.
 */
export const MAP_OPTION_DEFAULTS = {
	monitorTypes: {
		airnow: true,
		aqlite: true,
		aqview: true,
		bam1022: true,
		airgradient: true,
		purpleair: true,
		vozbox: true,
		inactive: false,
		inside: false
	},
	clustered: true,
	collocationSites: false,
	fireAndSmoke: true,
	evStations: false,
	evLevels: { lvl2: true, lvl3: true },
	wind: false
} as const;

type Toggle = { enabled: boolean };
type Option = { value: boolean };

export interface MapOptionTargets extends PollutantTargets {
	integration: PollutantTargets["integration"] & {
		clustered: boolean;
		displayOptions: Record<string, Option>;
	};
	collocationSites: Toggle;
	hmsFire: Toggle;
	hmsSmoke: Toggle;
	evStations: Toggle & { clustered: boolean; displayOptions: { lvl2: Option; lvl3: Option } };
	wind: Toggle;
	mapStyle: { reset(): void };
}

export function applyMapOptionDefaults(
	targets: MapOptionTargets,
	defaultPollutant: MonitorsPollutant | null
): void {
	if (defaultPollutant) {
		applyPollutantSelection(defaultPollutant, targets);
	} else {
		targets.integration.enabled = true;
	}

	for (const [key, value] of Object.entries(MAP_OPTION_DEFAULTS.monitorTypes)) {
		const option = targets.integration.displayOptions[key];
		if (option) option.value = value;
	}
	targets.integration.clustered = MAP_OPTION_DEFAULTS.clustered;

	targets.collocationSites.enabled = MAP_OPTION_DEFAULTS.collocationSites;
	targets.hmsFire.enabled = MAP_OPTION_DEFAULTS.fireAndSmoke;
	targets.hmsSmoke.enabled = MAP_OPTION_DEFAULTS.fireAndSmoke;

	targets.evStations.enabled = MAP_OPTION_DEFAULTS.evStations;
	targets.evStations.clustered = MAP_OPTION_DEFAULTS.clustered;
	targets.evStations.displayOptions.lvl2.value = MAP_OPTION_DEFAULTS.evLevels.lvl2;
	targets.evStations.displayOptions.lvl3.value = MAP_OPTION_DEFAULTS.evLevels.lvl3;

	targets.wind.enabled = MAP_OPTION_DEFAULTS.wind;
	targets.mapStyle.reset();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Implement `src/lib/options/reset-map-options.ts`**

```ts
import { monitorsManager } from "$lib/monitors/monitors.svelte";
import { monitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte";
import { collocationSitesMapIntegration } from "$lib/collocation-sites/collocations-map-integration.svelte";
import { hmsFireMapIntegration } from "$lib/hms/hms-fire-map-integration.svelte";
import { hmsSmokeMapIntegration } from "$lib/hms/hms-smoke-map-integration.svelte";
import { evStationsMapIntegration } from "$lib/ev-stations/ev-stations-map-integration.svelte";
import { windMapIntegration } from "$lib/wind/wind.svelte";
import { mapStyleState } from "$lib/map/map-style-state.svelte.js";
import { applyMapOptionDefaults } from "./map-option-defaults";

/** "Reset Map Options": restores every map option to its default. */
export function resetMapOptions(): void {
	applyMapOptionDefaults(
		{
			manager: monitorsManager,
			integration: monitorsMapIntegration,
			collocationSites: collocationSitesMapIntegration,
			hmsFire: hmsFireMapIntegration,
			hmsSmoke: hmsSmokeMapIntegration,
			evStations: evStationsMapIntegration,
			wind: windMapIntegration,
			mapStyle: mapStyleState
		},
		monitorsManager.meta?.default_pollutant ?? null
	);
}
```

- [ ] **Step 6: Type-check, format, commit**

Run: `npm run check && npm run format`
Expected: 0 errors.

```bash
git add src/lib/options/map-option-defaults.ts src/lib/options/reset-map-options.ts tests/options/map-option-defaults.test.ts
git commit -m "Add Reset Map Options defaults"
```

---

### Task 7: Legend components

**Files:**

- Create: `src/lib/legend/LegendBar.svelte`, `src/lib/legend/Legend.svelte`

**Interfaces:**

- Consumes: `LegendBarData`, `LegendSection`, `blocksBackground`, `gradientBackground`, `tickPosition` (Task 1).
- Produces (used by Task 9): `<Legend sections={Array<LegendSection>} />` — renders nothing when `sections` is empty; `<LegendBar bar={LegendBarData} />`.

- [ ] **Step 1: Create `src/lib/legend/LegendBar.svelte`**

```svelte
<script lang="ts">
	import {
		blocksBackground,
		gradientBackground,
		tickPosition,
		type LegendBarData
	} from "./legend-data";

	let { bar }: { bar: LegendBarData } = $props();

	const background = $derived(
		bar.kind === "gradient"
			? gradientBackground(bar.colors)
			: blocksBackground(bar.categories.map((category) => category.color))
	);

	// Labels placed on exact stop positions: gradient ticks, or block breakpoints.
	const positioned = $derived(bar.kind === "gradient" ? bar.ticks : (bar.breakpoints ?? null));
</script>

<div class="h-3 rounded" style:background></div>
{#if positioned}
	<div class="relative mt-1 h-4 text-xs">
		{#each positioned as label, i (i)}
			{@const isFirst = i === 0}
			{@const isLast = i === positioned.length - 1}
			<span
				class={[
					"absolute top-0 whitespace-nowrap",
					isFirst && "left-0",
					isLast && "right-0",
					!isFirst && !isLast && "-translate-x-1/2"
				]}
				style:left={!isFirst && !isLast ? `${tickPosition(i, positioned.length)}%` : undefined}
				>{label}</span
			>
		{/each}
	</div>
{:else if bar.kind === "blocks"}
	<div class="mt-1 flex text-xs">
		{#each bar.categories as category, i (i)}
			<span class="min-w-0 flex-1 text-center break-words">{category.label ?? ""}</span>
		{/each}
	</div>
{/if}
```

- [ ] **Step 2: Create `src/lib/legend/Legend.svelte`**

```svelte
<script lang="ts">
	import { ChevronDownIcon, InfoIcon } from "@lucide/svelte";
	import LegendBar from "./LegendBar.svelte";
	import type { LegendSection } from "./legend-data";

	let { sections }: { sections: Array<LegendSection> } = $props();

	// Independent of which sections are active, so toggling a layer doesn't reset it.
	let collapsed = $state(false);
</script>

{#if sections.length}
	<div class="pointer-events-auto w-84 max-w-[calc(100vw-2rem)] rounded-md bg-white shadow">
		<button
			type="button"
			class="flex w-full cursor-pointer items-center gap-2 px-4 py-2 font-semibold"
			aria-expanded={!collapsed}
			onclick={() => (collapsed = !collapsed)}
		>
			<InfoIcon size={18} class="text-gray-500" />
			<span class="flex-1 text-left">Legend</span>
			<ChevronDownIcon size={18} class="transition-transform {collapsed ? '-rotate-90' : ''}" />
		</button>
		{#if !collapsed}
			<div class="flex flex-col gap-3 border-t border-gray-200 px-4 py-3">
				{#each sections as section (section.id)}
					<div>
						<p class="mb-2 text-center text-sm font-semibold">
							{section.title}
							{#if section.unit}
								<span class="text-xs font-normal text-gray-500">({section.unit})</span>
							{/if}
						</p>
						<LegendBar bar={section.bar} />
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
```

- [ ] **Step 3: Autofix and type-check**

Run the Svelte MCP autofixer (`mcp__svelte__svelte-autofixer`) on both files and apply any fixes, then:
Run: `npm run check`
Expected: 0 errors. (The components aren't mounted until Task 9; rendering is verified there.)

- [ ] **Step 4: Format and commit**

```bash
npm run format
git add src/lib/legend/LegendBar.svelte src/lib/legend/Legend.svelte
git commit -m "Add unified collapsible legend components"
```

---

### Task 8: Options bar primitives + MapShell/Search wiring

**Files:**

- Create: `src/lib/options/layout.ts`, `src/lib/options/options-state.svelte.ts`, `src/lib/options/OptionsBar.svelte`, `src/lib/options/OptionsGroup.svelte`, `src/lib/options/OptionsMenu.svelte`, `src/lib/options/rows/CheckboxRow.svelte`, `src/lib/options/rows/RadioRow.svelte`, `src/lib/options/rows/SubmenuRow.svelte`, `src/lib/options/rows/GroupRow.svelte`, `src/lib/options/rows/MarkerIcon.svelte`
- Modify: `src/lib/map/MapShell.svelte`, `src/lib/search/Search.svelte`, `src/lib/MonitorMapLayout.svelte` (search snippet only)

**Interfaces:**

- Consumes: `groupState`, `setGroup` (Task 2).
- Produces (used by Task 9):
  - `WIDE_LAYOUT_QUERY`, `isWideLayout(): boolean`
  - `OptionsMenusState` with `isOpen(id)`, `toggle(id)`, `closeOthers(id)`, `close(id)`, `closeAll()`; `provideOptionsMenus()`, `useOptionsMenus()`
  - `<OptionsBar search?={Snippet}>{menus}</OptionsBar>`
  - `<OptionsGroup>{OptionsMenu…}</OptionsGroup>`
  - `<OptionsMenu id label icon={Snippet} disabled? alignRight? iconOnly?>{rows}</OptionsMenu>`
  - `<CheckboxRow label bind:checked icon? indeterminate? disabled? expanded? />`
  - `<RadioRow name label checked onselect unit? help? icon? />`
  - `<SubmenuRow label bind:checked indeterminate? icon?>{child rows}</SubmenuRow>`
  - `<GroupRow label options={Array<{ key: string; label: string; option: { value: boolean } }>} icon? />`
  - `<MarkerIcon icon={MapImageIcon | undefined} class? />`
  - `MapShellProps.search?: Snippet`

- [ ] **Step 1: Layout helper and menu state**

`src/lib/options/layout.ts`:

```ts
/**
 * Tailwind's default `md` breakpoint (48rem). Layout itself is pure CSS (`md:` / `max-md:`);
 * this is only read at event time for the few behaviors that differ between the toolbar and
 * the options panel.
 */
export const WIDE_LAYOUT_QUERY = "(min-width: 48rem)";

export function isWideLayout(): boolean {
	return window.matchMedia(WIDE_LAYOUT_QUERY).matches;
}
```

`src/lib/options/options-state.svelte.ts`:

```ts
import { getContext, setContext } from "svelte";
import { SvelteSet } from "svelte/reactivity";
import { isWideLayout } from "./layout";

const OPTIONS_MENUS_KEY = Symbol("monitor-map-options-menus");

/** Which menus are opened by click: at most one on the toolbar, any number in the panel. */
export class OptionsMenusState {
	private open = new SvelteSet<string>();

	isOpen(id: string): boolean {
		return this.open.has(id);
	}

	toggle(id: string): void {
		if (this.open.has(id)) {
			this.open.delete(id);
			return;
		}
		if (isWideLayout()) this.open.clear();
		this.open.add(id);
	}

	/** Hovering another toolbar trigger closes any dropdown left open by a click. */
	closeOthers(id: string): void {
		for (const other of [...this.open]) {
			if (other !== id) this.open.delete(other);
		}
	}

	close(id: string): void {
		this.open.delete(id);
	}

	closeAll(): void {
		this.open.clear();
	}
}

export function provideOptionsMenus(): OptionsMenusState {
	return setContext(OPTIONS_MENUS_KEY, new OptionsMenusState());
}

export function useOptionsMenus(): OptionsMenusState {
	const menus = getContext<OptionsMenusState | undefined>(OPTIONS_MENUS_KEY);
	if (!menus) throw new Error("OptionsMenu must be rendered inside OptionsBar");
	return menus;
}
```

- [ ] **Step 2: `OptionsBar.svelte`**

```svelte
<script lang="ts">
	import type { Snippet } from "svelte";
	import type { Attachment } from "svelte/attachments";
	import { MenuIcon, XIcon } from "@lucide/svelte";
	import { provideOptionsMenus } from "./options-state.svelte.js";
	import { isWideLayout } from "./layout";

	interface Props {
		/** OptionsGroup / OptionsMenu content */
		children?: Snippet;
		/** Rendered last in the toolbar (wide) or beside the menu button (narrow) */
		search?: Snippet;
	}

	let { children, search }: Props = $props();

	const menus = provideOptionsMenus();
	const panelId = "monitor-map-options-panel";
	let panelOpen = $state(false);

	// Toolbar only: clicks outside close any click-opened dropdown; clicks inside never do.
	const closeOnOutsideClick: Attachment<HTMLElement> = (node) => {
		function handler(e: MouseEvent) {
			if (isWideLayout() && !node.contains(e.target as Node)) menus.closeAll();
		}
		document.addEventListener("click", handler);
		return () => document.removeEventListener("click", handler);
	};

	function onkeydown(e: KeyboardEvent) {
		if (e.key !== "Escape") return;
		panelOpen = false;
		if (isWideLayout()) menus.closeAll();
	}
</script>

<svelte:window {onkeydown} />

<!-- Covers the map area so the narrow panel can fill it; passes pointer events through. -->
<div class="pointer-events-none absolute inset-0 z-10">
	<div
		{@attach closeOnOutsideClick}
		class="md:absolute md:top-4 md:right-16 md:left-4 md:flex md:flex-wrap md:items-start md:gap-2"
	>
		<div
			class="pointer-events-auto flex items-start gap-2 max-md:absolute max-md:top-4 max-md:left-4 md:contents"
		>
			<button
				type="button"
				class="flex size-10 shrink-0 items-center justify-center rounded-md bg-white shadow md:hidden"
				aria-label="Open map options"
				aria-expanded={panelOpen}
				aria-controls={panelId}
				onclick={() => (panelOpen = true)}
			>
				<MenuIcon size={22} />
			</button>
			{#if search}
				<div class="md:order-last">{@render search()}</div>
			{/if}
		</div>
		<div
			id={panelId}
			class={[
				"pointer-events-auto md:contents",
				"max-md:absolute max-md:inset-0 max-md:z-20 max-md:flex max-md:flex-col max-md:gap-2 max-md:overflow-y-auto max-md:bg-white max-md:p-4 max-md:transition-[translate,visibility] max-md:duration-200",
				!panelOpen && "max-md:invisible max-md:-translate-x-full"
			]}
		>
			<div class="mb-2 flex items-center justify-between md:hidden">
				<p class="text-lg font-semibold">Map Options</p>
				<button
					type="button"
					class="flex size-9 items-center justify-center rounded-md hover:bg-gray-100"
					aria-label="Close map options"
					onclick={() => (panelOpen = false)}
				>
					<XIcon size={20} />
				</button>
			</div>
			{@render children?.()}
		</div>
	</div>
</div>
```

- [ ] **Step 3: `OptionsGroup.svelte` and `OptionsMenu.svelte`**

`src/lib/options/OptionsGroup.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from "svelte";

	let { children }: { children: Snippet } = $props();
</script>

<!-- Joined button cluster on the toolbar; a plain stack of sections in the panel. -->
<div
	class="flex flex-col gap-2 md:flex-row md:gap-0 md:divide-x md:divide-gray-200 md:rounded-md md:bg-white md:shadow"
>
	{@render children()}
</div>
```

`src/lib/options/OptionsMenu.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from "svelte";
	import { ChevronDownIcon } from "@lucide/svelte";
	import { useOptionsMenus } from "./options-state.svelte.js";
	import { isWideLayout } from "./layout";

	interface Props {
		id: string;
		label: string;
		icon: Snippet;
		children: Snippet;
		disabled?: boolean;
		/** Anchor the toolbar dropdown to the trigger's right edge */
		alignRight?: boolean;
		/** Show only the icon on the toolbar; the panel section still shows the label */
		iconOnly?: boolean;
	}

	let {
		id,
		label,
		icon,
		children,
		disabled = false,
		alignRight = false,
		iconOnly = false
	}: Props = $props();

	const menus = useOptionsMenus();
	const contentId = $derived(`monitor-map-options-${id}`);
	const open = $derived(menus.isOpen(id) && !disabled);
</script>

<div
	role="presentation"
	class="group/menu relative md:first:[&>button]:rounded-l-md md:last:[&>button]:rounded-r-md"
	onmouseenter={() => {
		if (isWideLayout()) menus.closeOthers(id);
	}}
>
	<button
		type="button"
		{disabled}
		aria-expanded={open}
		aria-controls={contentId}
		aria-label={iconOnly ? label : undefined}
		class="flex h-10 w-full items-center gap-2 px-3 text-sm font-medium whitespace-nowrap select-none disabled:cursor-not-allowed max-md:rounded-md max-md:border max-md:border-gray-200 max-md:bg-white md:w-auto md:hover:bg-gray-100 md:disabled:hover:bg-transparent"
		onclick={() => menus.toggle(id)}
	>
		<span class={["flex size-5 items-center justify-center", disabled && "opacity-50"]}>
			{@render icon()}
		</span>
		<span class={[disabled && "opacity-50", iconOnly && "md:hidden"]}>{label}</span>
		<span class={["ml-auto", disabled && "opacity-50", iconOnly && "md:hidden"]}>
			<ChevronDownIcon size={16} />
		</span>
	</button>
	<div
		id={contentId}
		class={[
			"max-md:pt-1 md:absolute md:top-full md:z-20 md:min-w-64 md:pt-1",
			alignRight ? "md:right-0" : "md:left-0",
			open ? "block" : "hidden",
			!disabled && "md:group-hover/menu:block"
		]}
	>
		<div class="py-1 md:max-h-[69vh] md:overflow-y-auto md:rounded-md md:bg-white md:shadow-lg">
			{@render children()}
		</div>
	</div>
</div>
```

- [ ] **Step 4: Row components**

`src/lib/options/rows/CheckboxRow.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from "svelte";
	import type { Attachment } from "svelte/attachments";
	import { ChevronDownIcon } from "@lucide/svelte";

	interface Props {
		label: string;
		checked: boolean;
		icon?: Snippet;
		indeterminate?: boolean;
		disabled?: boolean;
		/** When set, shows a chevron reflecting whether this row's children are expanded */
		expanded?: boolean;
	}

	let {
		label,
		checked = $bindable(),
		icon,
		indeterminate = false,
		disabled = false,
		expanded
	}: Props = $props();

	// indeterminate is a DOM property with no HTML attribute; re-runs when the prop changes.
	const syncIndeterminate: Attachment<HTMLInputElement> = (input) => {
		input.indeterminate = indeterminate;
	};
</script>

<label
	class="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm whitespace-nowrap select-none hover:bg-gray-100 has-disabled:cursor-not-allowed has-disabled:opacity-50"
>
	<input
		type="checkbox"
		class="accent-brand size-4 shrink-0"
		bind:checked
		{disabled}
		{@attach syncIndeterminate}
	/>
	{#if icon}
		<span class="flex size-5 shrink-0 items-center justify-center">{@render icon()}</span>
	{/if}
	<span class="flex-1">{label}</span>
	{#if expanded !== undefined}
		<ChevronDownIcon
			size={16}
			class="ml-3 shrink-0 text-gray-500 transition-transform {expanded ? '' : '-rotate-90'}"
		/>
	{/if}
</label>
```

`src/lib/options/rows/RadioRow.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from "svelte";

	interface Props {
		name: string;
		label: string;
		checked: boolean;
		onselect: () => void;
		unit?: string;
		help?: string;
		icon?: Snippet;
	}

	let { name, label, checked, onselect, unit, help, icon }: Props = $props();
</script>

<label
	class="flex cursor-pointer flex-col gap-0.5 px-3 py-1.5 text-sm select-none hover:bg-gray-100"
>
	<span class="flex items-center gap-2 whitespace-nowrap">
		<input type="radio" class="accent-brand size-4 shrink-0" {name} {checked} onchange={onselect} />
		{#if icon}
			<span class="flex size-5 shrink-0 items-center justify-center">{@render icon()}</span>
		{/if}
		<span>
			{label}
			{#if unit}<span class="text-xs text-gray-500">({unit})</span>{/if}
		</span>
	</span>
	{#if help}
		<span class="pl-6 text-xs whitespace-normal text-gray-500">{help}</span>
	{/if}
</label>
```

`src/lib/options/rows/SubmenuRow.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from "svelte";
	import CheckboxRow from "./CheckboxRow.svelte";

	interface Props {
		label: string;
		checked: boolean;
		indeterminate?: boolean;
		icon?: Snippet;
		children: Snippet;
	}

	let { label, checked = $bindable(), indeterminate = false, icon, children }: Props = $props();

	// Children show only while the parent is (partly) on, as in the demo.
	const expanded = $derived(checked || indeterminate);
</script>

<CheckboxRow {label} {icon} {indeterminate} {expanded} bind:checked />
{#if expanded}
	<div class="ml-5 border-l border-gray-200">{@render children()}</div>
{/if}
```

`src/lib/options/rows/GroupRow.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from "svelte";
	import CheckboxRow from "./CheckboxRow.svelte";
	import SubmenuRow from "./SubmenuRow.svelte";
	import { groupState, setGroup } from "../group-state";

	interface GroupOption {
		key: string;
		label: string;
		option: { value: boolean };
	}

	interface Props {
		label: string;
		/** Only the rows currently visible; hidden rows are never touched by select-all */
		options: Array<GroupOption>;
		icon?: Snippet;
	}

	let { label, options, icon }: Props = $props();

	const status = $derived(groupState(options.map((child) => child.option.value)));
</script>

{#if status !== "empty"}
	<SubmenuRow
		{label}
		{icon}
		indeterminate={status === "indeterminate"}
		bind:checked={
			() => status === "checked",
			(value) =>
				setGroup(
					options.map((child) => child.option),
					value
				)
		}
	>
		{#each options as child (child.key)}
			<CheckboxRow label={child.label} bind:checked={child.option.value} />
		{/each}
	</SubmenuRow>
{/if}
```

`src/lib/options/rows/MarkerIcon.svelte`:

```svelte
<script lang="ts">
	import type { MapImageIcon } from "$lib/map/integrations/types";

	let { icon, class: className = "w-4" }: { icon: MapImageIcon | undefined; class?: string } =
		$props();
</script>

{#if icon}
	<img src={icon.image.src} alt="" class={className} />
{/if}
```

- [ ] **Step 5: MapShell renders OptionsBar**

In `src/lib/map/MapShell.svelte`:

- Add to `MapShellProps` after `menu`:

```ts
		/** Rendered last in the toolbar (wide) or beside the menu button (narrow) */
		search?: Snippet;
```

- Change the `menu` doc comment to `/** Menus (OptionsGroup/OptionsMenu) rendered inside the options toolbar/panel */`.
- Replace `import Menu from "$lib/map/Menu.svelte";` with `import OptionsBar from "$lib/options/OptionsBar.svelte";`.
- Add `search,` to the destructured props (after `menu,`).
- Replace

```svelte
{#if menu}
	<div class="absolute top-4 left-4 z-10">
		<Menu>{@render menu()}</Menu>
	</div>
{/if}
```

with

```svelte
{#if menu || search}
	<OptionsBar {search}>{@render menu?.()}</OptionsBar>
{/if}
```

- [ ] **Step 6: Search fits the toolbar**

In `src/lib/search/Search.svelte`, replace the root `div`'s class array and the first row + button with:

```svelte
<div
	class={[
		"flex flex-col overflow-hidden bg-white shadow transition-all duration-300 select-none",
		collapsed ? "h-10 w-10 rounded-md" : "w-[min(22.5rem,calc(100vw-5.5rem))] rounded-lg",
		!collapsed && results.length ? "max-h-90" : "max-h-10"
	]}
	use:clickOutside
>
	<div class="flex h-10 w-full shrink-0 items-center">
		<button
			class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-gray-700"
			onclick={openSearch}
			aria-label="Open search"
		>
			<SearchIcon size="20" />
		</button>
```

(the input, clear button and results list below are unchanged).

- [ ] **Step 7: Move Search into the toolbar slot**

In `src/lib/MonitorMapLayout.svelte`, delete the Search block from the `overlays` snippet:

```svelte
<div class="absolute top-4 left-20 z-10">
	<Search />
</div>
```

and add after the `menu` snippet:

```svelte
{#snippet search()}
	<Search />
{/snippet}
```

- [ ] **Step 8: Autofix, check, manual verify**

Run the Svelte MCP autofixer on every new/changed `.svelte` file and apply fixes. Then:
Run: `npm run check && npm run lint && npm test`
Expected: 0 errors, lint clean, tests PASS.

Run `npm run dev`:

- Desktop width: the old menu components now render as a horizontal strip at the top-left with Search after them; MapTiler controls top-right are not overlapped.
- Chrome DevTools device toolbar at 390px wide: only the menu button + search show; tapping the menu button slides in a full-map white "Map Options" panel; its X and Escape close it.

- [ ] **Step 9: Format and commit**

```bash
npm run format
git add src/lib/options src/lib/map/MapShell.svelte src/lib/search/Search.svelte src/lib/MonitorMapLayout.svelte
git commit -m "Add options toolbar and panel primitives"
```

---

### Task 9: The five menus + MonitorMapLayout wiring

**Files:**

- Create: `src/lib/options/menus/PollutantMenu.svelte`, `MonitorsMenu.svelte`, `LayersMenu.svelte`, `OverlaysMenu.svelte`, `SettingsMenu.svelte`
- Modify: `src/lib/MonitorMapLayout.svelte`

**Interfaces:**

- Consumes: everything from Tasks 1–8 by the names listed there.
- Produces: the finished UI; `MonitorMapLayout` no longer imports any old menu/legend component.

- [ ] **Step 1: `PollutantMenu.svelte`**

```svelte
<script lang="ts">
	import { BanIcon, HazeIcon, SunDimIcon } from "@lucide/svelte";
	import OptionsMenu from "../OptionsMenu.svelte";
	import RadioRow from "../rows/RadioRow.svelte";
	import { useOptionsMenus } from "../options-state.svelte.js";
	import { isWideLayout } from "../layout";
	import {
		applyPollutantSelection,
		currentSelection,
		type PollutantSelection
	} from "../pollutant-param";
	import { monitorsManager } from "$lib/monitors/monitors.svelte";
	import { monitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte";

	interface PollutantOption {
		value: PollutantSelection;
		label: string;
		unit?: string;
		help?: string;
		icon: typeof HazeIcon;
		color: string;
	}

	const options: Array<PollutantOption> = [
		{
			value: "pm25",
			label: "PM2.5",
			unit: "µg/m³",
			help: "Fine particles from smoke, dust, and vehicle exhaust.",
			icon: HazeIcon,
			color: "#bc8f8f"
		},
		{
			value: "o3",
			label: "Ozone",
			unit: "ppb",
			help: "Ground-level gas that forms in sunlight on hot days.",
			icon: SunDimIcon,
			color: "#daa520"
		},
		{ value: "none", label: "None", icon: BanIcon, color: "#778899" }
	];

	const menus = useOptionsMenus();
	const selection = $derived(
		currentSelection(monitorsManager.pollutant, monitorsMapIntegration.enabled)
	);
	const selected = $derived(options.find((o) => o.value === selection) ?? options[0]);

	function select(value: PollutantSelection) {
		applyPollutantSelection(value, {
			manager: monitorsManager,
			integration: monitorsMapIntegration
		});
		// Toolbar dropdown closes on pick; the panel section stays open.
		if (isWideLayout()) menus.close("pollutant");
	}
</script>

<OptionsMenu id="pollutant" label={selected.label}>
	{#snippet icon()}
		<selected.icon size={20} color={selected.color} />
	{/snippet}
	{#each options as option, i (option.value)}
		{#if i > 0}<hr class="my-1 border-gray-200" />{/if}
		<RadioRow
			name="monitor-map-pollutant"
			label={option.label}
			unit={option.unit}
			help={option.help}
			checked={selection === option.value}
			onselect={() => select(option.value)}
		>
			{#snippet icon()}
				<option.icon size={18} color={option.color} />
			{/snippet}
		</RadioRow>
	{/each}
</OptionsMenu>
```

- [ ] **Step 2: `MonitorsMenu.svelte`**

```svelte
<script lang="ts">
	import { CrosshairIcon, RadioTowerIcon } from "@lucide/svelte";
	import OptionsMenu from "../OptionsMenu.svelte";
	import CheckboxRow from "../rows/CheckboxRow.svelte";
	import GroupRow from "../rows/GroupRow.svelte";
	import MarkerIcon from "../rows/MarkerIcon.svelte";
	import { monitorsManager } from "$lib/monitors/monitors.svelte";
	import { monitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte";
	import { collocationSitesMapIntegration } from "$lib/collocation-sites/collocations-map-integration.svelte";
	import {
		LOW_COST_TYPES,
		REFERENCE_GRADE_TYPES,
		typeSupportsPollutant,
		type MonitorGroupType
	} from "$lib/monitors/monitor-groups";

	// Rows for types that don't report the current pollutant are hidden (meta-driven).
	function visibleRows(types: ReadonlyArray<MonitorGroupType>) {
		const displayOptions = monitorsMapIntegration.displayOptions;
		return types
			.filter((type) =>
				typeSupportsPollutant(monitorsManager.meta, type, monitorsManager.pollutant)
			)
			.map((type) => ({
				key: type,
				label: displayOptions[type].label,
				option: displayOptions[type]
			}));
	}

	const referenceGrade = $derived(visibleRows(REFERENCE_GRADE_TYPES));
	const lowCost = $derived(visibleRows(LOW_COST_TYPES));
	const icons = monitorsMapIntegration.icons;
</script>

<OptionsMenu id="monitors" label="Monitors" disabled={!monitorsMapIntegration.enabled}>
	{#snippet icon()}
		<RadioTowerIcon size={20} color="#4682b4" />
	{/snippet}
	<GroupRow label="Reference-grade" options={referenceGrade}>
		{#snippet icon()}
			<MarkerIcon icon={icons.get("outside-display-triangle")} />
		{/snippet}
	</GroupRow>
	<GroupRow label="Low-cost sensors" options={lowCost}>
		{#snippet icon()}
			<MarkerIcon icon={icons.get("outside-display-circle")} />
		{/snippet}
	</GroupRow>
	<hr class="my-1 border-gray-200" />
	<CheckboxRow label="Inactive" bind:checked={monitorsMapIntegration.displayOptions.inactive.value}>
		{#snippet icon()}
			<MarkerIcon icon={monitorsMapIntegration.displayOptions.inactive.icon} />
		{/snippet}
	</CheckboxRow>
	<CheckboxRow label="Inside" bind:checked={monitorsMapIntegration.displayOptions.inside.value}>
		{#snippet icon()}
			<MarkerIcon icon={monitorsMapIntegration.displayOptions.inside.icon} />
		{/snippet}
	</CheckboxRow>
	{#if monitorsManager.pollutant === "pm25"}
		<CheckboxRow label="Collocation Sites" bind:checked={collocationSitesMapIntegration.enabled}>
			{#snippet icon()}
				<CrosshairIcon size={16} color="#4A5FC6" />
			{/snippet}
		</CheckboxRow>
	{/if}
</OptionsMenu>
```

- [ ] **Step 3: `LayersMenu.svelte` and `OverlaysMenu.svelte`**

`LayersMenu.svelte`:

```svelte
<script lang="ts">
	import { FlameIcon, LayersIcon, PlugZapIcon } from "@lucide/svelte";
	import OptionsMenu from "../OptionsMenu.svelte";
	import CheckboxRow from "../rows/CheckboxRow.svelte";
	import SubmenuRow from "../rows/SubmenuRow.svelte";
	import MarkerIcon from "../rows/MarkerIcon.svelte";
	import { hmsFireMapIntegration } from "$lib/hms/hms-fire-map-integration.svelte";
	import { hmsSmokeMapIntegration } from "$lib/hms/hms-smoke-map-integration.svelte";
	import { evStationsMapIntegration } from "$lib/ev-stations/ev-stations-map-integration.svelte";

	const levels = $derived(evStationsMapIntegration.displayOptions);
</script>

<OptionsMenu id="layers" label="Layers">
	{#snippet icon()}
		<LayersIcon size={20} color="#708090" />
	{/snippet}
	<CheckboxRow
		label="Fire & Smoke"
		bind:checked={
			() => hmsFireMapIntegration.enabled && hmsSmokeMapIntegration.enabled,
			(value) => {
				hmsFireMapIntegration.enabled = value;
				hmsSmokeMapIntegration.enabled = value;
			}
		}
	>
		{#snippet icon()}
			<FlameIcon size={18} color="#ff4500" />
		{/snippet}
	</CheckboxRow>
	<SubmenuRow label="EV Chargers" bind:checked={evStationsMapIntegration.enabled}>
		{#snippet icon()}
			<PlugZapIcon size={18} color="#708090" />
		{/snippet}
		<CheckboxRow label="Level 2" bind:checked={evStationsMapIntegration.displayOptions.lvl2.value}>
			{#snippet icon()}
				<MarkerIcon icon={levels.lvl2.icon} class="w-5" />
			{/snippet}
		</CheckboxRow>
		<CheckboxRow label="Level 3" bind:checked={evStationsMapIntegration.displayOptions.lvl3.value}>
			{#snippet icon()}
				<MarkerIcon icon={levels.lvl3.icon} class="w-5" />
			{/snippet}
		</CheckboxRow>
	</SubmenuRow>
</OptionsMenu>
```

`OverlaysMenu.svelte`:

```svelte
<script lang="ts">
	import { SquareStackIcon, WindIcon } from "@lucide/svelte";
	import OptionsMenu from "../OptionsMenu.svelte";
	import CheckboxRow from "../rows/CheckboxRow.svelte";
	import { windMapIntegration } from "$lib/wind/wind.svelte";
</script>

<!-- Independent checkboxes: several overlays may be on at once. -->
<OptionsMenu id="overlays" label="Overlays" alignRight>
	{#snippet icon()}
		<SquareStackIcon size={20} color="#708090" />
	{/snippet}
	<CheckboxRow label="Wind" bind:checked={windMapIntegration.enabled}>
		{#snippet icon()}
			<WindIcon size={18} color="#1e90ff" />
		{/snippet}
	</CheckboxRow>
</OptionsMenu>
```

- [ ] **Step 4: `SettingsMenu.svelte`**

```svelte
<script lang="ts">
	import { ContrastIcon, MapIcon, NetworkIcon, RotateCcwIcon, SettingsIcon } from "@lucide/svelte";
	import OptionsMenu from "../OptionsMenu.svelte";
	import CheckboxRow from "../rows/CheckboxRow.svelte";
	import RadioRow from "../rows/RadioRow.svelte";
	import { resetMapOptions } from "../reset-map-options";
	import { MAP_STYLE_OPTIONS } from "$lib/map/utils";
	import { mapStyleState } from "$lib/map/map-style-state.svelte.js";
	import { monitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte";
	import { evStationsMapIntegration } from "$lib/ev-stations/ev-stations-map-integration.svelte";
</script>

<OptionsMenu id="settings" label="Settings" iconOnly alignRight>
	{#snippet icon()}
		<SettingsIcon size={20} color="#696969" />
	{/snippet}
	<CheckboxRow
		label="Marker Clusters"
		bind:checked={
			() => monitorsMapIntegration.clustered && evStationsMapIntegration.clustered,
			(value) => {
				monitorsMapIntegration.clustered = value;
				evStationsMapIntegration.clustered = value;
			}
		}
	>
		{#snippet icon()}
			<NetworkIcon size={18} color="#1e90ff" />
		{/snippet}
	</CheckboxRow>
	<hr class="my-1 border-gray-200" />
	<div class="px-3 py-1.5 text-sm">
		<label for="monitor-map-basemap" class="mb-1 flex items-center gap-2 font-semibold">
			<MapIcon size={18} color="#708090" />
			Basemap
		</label>
		<select
			id="monitor-map-basemap"
			class="w-full rounded-md border border-gray-300 bg-white p-1.5"
			bind:value={
				() => mapStyleState.referenceStyle, (style) => mapStyleState.selectReferenceStyle(style)
			}
		>
			{#each MAP_STYLE_OPTIONS as style (style.getId())}
				<option value={style}>{style.getName()}</option>
			{/each}
		</select>
	</div>
	<hr class="my-1 border-gray-200" />
	<p class="flex items-center gap-2 px-3 pt-1.5 text-sm font-semibold">
		<ContrastIcon size={18} color="#708090" />
		Theme
	</p>
	{#each mapStyleState.referenceStyle.getVariants() as variant (variant.getId())}
		<RadioRow
			name="monitor-map-theme"
			label={variant.getName()}
			checked={variant === mapStyleState.variant}
			onselect={() => mapStyleState.selectVariant(variant)}
		/>
	{/each}
	<hr class="my-1 border-gray-200" />
	<div class="px-3 py-1.5">
		<button
			type="button"
			class="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
			onclick={resetMapOptions}
		>
			<RotateCcwIcon size={16} />
			Reset Map Options
		</button>
	</div>
</OptionsMenu>
```

- [ ] **Step 5: Rewire `MonitorMapLayout.svelte`**

Replace the whole file with:

```svelte
<script lang="ts">
	import type { Snippet } from "svelte";
	import { onDestroy, untrack } from "svelte";
	import { searchParams } from "sv-router";
	import MapShell from "$lib/map/MapShell.svelte";
	import OptionsGroup from "$lib/options/OptionsGroup.svelte";
	import PollutantMenu from "$lib/options/menus/PollutantMenu.svelte";
	import MonitorsMenu from "$lib/options/menus/MonitorsMenu.svelte";
	import LayersMenu from "$lib/options/menus/LayersMenu.svelte";
	import OverlaysMenu from "$lib/options/menus/OverlaysMenu.svelte";
	import SettingsMenu from "$lib/options/menus/SettingsMenu.svelte";
	import {
		applyPollutantSelection,
		currentSelection,
		parsePollutantParam
	} from "$lib/options/pollutant-param";
	import Legend from "$lib/legend/Legend.svelte";
	import {
		fireSmokeLegendSections,
		pollutantLegendSection,
		type LegendSection
	} from "$lib/legend/legend-data";
	import { monitorsManager } from "$lib/monitors/monitors.svelte";
	import { monitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte";
	import { windMapIntegration } from "$lib/wind/wind.svelte";
	import { baseLayerSeperator } from "$lib/map/integrations/base-layer-seperator";
	import type { SomeMapIntegration } from "$lib/map/integrations/types";
	import { collocationSitesManager } from "$lib/collocation-sites/collocations.svelte";
	import { collocationSitesMapIntegration } from "$lib/collocation-sites/collocations-map-integration.svelte";
	import { evStationsMapIntegration } from "$lib/ev-stations/ev-stations-map-integration.svelte";
	import { hmsManager } from "$lib/hms/hms.svelte";
	import { hmsFireMapIntegration } from "$lib/hms/hms-fire-map-integration.svelte";
	import { FIRE_LEGEND_CATEGORIES } from "$lib/hms/hms-fire-icon-manager";
	import { hmsSmokeMapIntegration, SMOKE_LEGEND } from "$lib/hms/hms-smoke-map-integration.svelte";
	import Search from "$lib/search/Search.svelte";
	import { useMonitorMapRouter } from "./router-context";

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const { route, navigate, basePath } = useMonitorMapRouter();

	const integrations: Array<SomeMapIntegration> = [
		baseLayerSeperator,
		collocationSitesMapIntegration,
		windMapIntegration,
		hmsSmokeMapIntegration,
		hmsFireMapIntegration,
		monitorsMapIntegration,
		evStationsMapIntegration
	];

	const pollutantTargets = { manager: monitorsManager, integration: monitorsMapIntegration };

	// "?pollutant=none" must disable monitors before the effects below first run, so the
	// state->URL effect never sees enabled monitors and overwrites the param.
	if (parsePollutantParam(route.search.pollutant) === "none") {
		monitorsMapIntegration.enabled = false;
	}

	monitorsManager.init(route.search.pollutant);
	collocationSitesManager.init();
	hmsManager.init();
	monitorsMapIntegration.onMonitorClick = (id: string) => {
		navigate(`${basePath}/monitor/:id`, { params: { id } }).catch(console.error);
	};

	let panelOpen = $derived(route.pathname.startsWith(`${basePath}/monitor/`));

	// Keep the Pollutant menu's selection (pm25 / o3 / none) and the "pollutant" URL param in
	// sync, both directions. init() only seeds the pollutant on the manager's first-ever
	// initialization; this effect applies a later "?pollutant=" change (e.g. navigating in from
	// elsewhere) to an already-running map.
	$effect(() => {
		const selection = parsePollutantParam(route.search.pollutant);
		if (!monitorsManager.initialized || !selection) return;
		// Read current state via untrack: this effect must only react to the URL changing. Tracking
		// state here would make a UI-driven change re-trigger this effect before the effect below
		// syncs the URL, so it would see the stale URL and revert the user's change.
		untrack(() => {
			if (
				currentSelection(monitorsManager.pollutant, monitorsMapIntegration.enabled) !== selection
			) {
				applyPollutantSelection(selection, pollutantTargets);
			}
		});
	});

	// ...and the reverse: reflect UI-driven changes back to the URL.
	$effect(() => {
		const selection = currentSelection(monitorsManager.pollutant, monitorsMapIntegration.enabled);
		if (selection && searchParams.get("pollutant") !== selection) {
			searchParams.set("pollutant", selection);
		}
	});

	// Refetch monitors when the pollutant changes after the initial load. Clearing first blanks
	// the markers instead of briefly coloring them with the previous pollutant's readings.
	let fetchedPollutant: string | null = null;
	$effect(() => {
		const pollutant = monitorsManager.pollutant;
		if (!monitorsManager.initialized) return;
		if (fetchedPollutant !== null && fetchedPollutant !== pollutant) {
			untrack(() => {
				monitorsManager.list = [];
				monitorsManager.latest = null;
				monitorsManager.update();
			});
		}
		fetchedPollutant = pollutant;
	});

	// Clear selected icon scale when the detail panel closes
	$effect(() => {
		if (panelOpen) return;
		monitorsMapIntegration.selectedMonitorId = null;
	});

	const legendSections: Array<LegendSection> = $derived.by(() => {
		const sections: Array<LegendSection> = [];
		if (monitorsMapIntegration.enabled && monitorsManager.pollutant && monitorsManager.levels) {
			const pollutant = pollutantLegendSection(monitorsManager.pollutant, monitorsManager.levels);
			if (pollutant) sections.push(pollutant);
		}
		if (hmsFireMapIntegration.enabled && hmsSmokeMapIntegration.enabled) {
			sections.push(...fireSmokeLegendSections(FIRE_LEGEND_CATEGORIES, SMOKE_LEGEND));
		}
		return sections;
	});

	onDestroy(() => {
		monitorsManager.autoUpdate.stop();
	});
</script>

<MapShell
	{integrations}
	ready={monitorsManager.initialized}
	{panelOpen}
	knownRoutes={[`${basePath}/monitor/`]}
	{basePath}
>
	{#snippet menu()}
		<OptionsGroup>
			<PollutantMenu />
			<MonitorsMenu />
		</OptionsGroup>
		<OptionsGroup>
			<LayersMenu />
			<OverlaysMenu />
			<SettingsMenu />
		</OptionsGroup>
	{/snippet}
	{#snippet search()}
		<Search />
	{/snippet}
	{#snippet overlays()}
		<div class="pointer-events-none absolute bottom-4 left-4 z-10">
			<Legend sections={legendSections} />
		</div>
	{/snippet}
	{@render children()}
</MapShell>
```

- [ ] **Step 6: Autofix and check**

Run the Svelte MCP autofixer on all five menus and `MonitorMapLayout.svelte`; apply fixes.
Run: `npm run check && npm run lint && npm test`
Expected: 0 errors, lint clean, tests PASS.

- [ ] **Step 7: Manual verification in Chrome (`npm run dev`)**

Desktop width (≥768px):

- [ ] Hovering a trigger opens its dropdown; moving away closes it. Clicking a trigger keeps it open; clicking another trigger switches; hovering another trigger closes a click-opened one; clicking the map closes it; checking boxes inside never closes it; Escape closes it.
- [ ] Pollutant: trigger shows icon + "PM2.5"/"Ozone"/"None"; picking closes the dropdown; URL `?pollutant=` follows (`pm25`/`o3`/`none`).
- [ ] None: markers disappear, Monitors trigger is grayed and won't open, pollutant legend section disappears; wait 2+ minutes (or call `monitorsManager.update()` in the console) — markers stay hidden (Review Focus #1). Picking PM2.5 again restores markers immediately.
- [ ] Load `/?pollutant=none` directly: no markers, URL stays `none`. Load `/?pollutant=PM25`: map uses the meta default and the URL is rewritten to it (Review Focus #2).
- [ ] Monitors: under Ozone, PM2.5-only rows (e.g. PurpleAir, AirGradient) are hidden and a group with no rows disappears (Review Focus #3). Unchecking one child makes its group indeterminate; checking the group checks all visible children; unchecking the group collapses its child list.
- [ ] Collocation Sites appears only under PM2.5; turning it on then switching to Ozone or None removes the crosshairs from the map, and switching back to PM2.5 restores them (still checked). Changing the basemap while on Ozone/None doesn't bring them back.
- [ ] Layers: Fire & Smoke toggles both layers and its two legend bars; EV Chargers off by default, checking it shows Level 2/3 (both checked) and loads stations.
- [ ] Overlays: Wind toggles the wind layer. Settings: Marker Clusters toggles clustering for monitors and EV; Basemap list changes the map; Theme list shows that basemap's variants; with Dark selected, switching to a basemap that has Dark keeps Dark, switching to one without it selects its default (Review Focus #4).
- [ ] Reset Map Options restores pollutant default, all toggles, clustering and Streets/Default basemap; markers, layers and legend update.
- [ ] Legend: PM2.5 ticks read 0 · 9 · 35 · 55 · 150 · 250 under the right colors; Ozone shows 5 ticks; collapsing persists while toggling layers; the card disappears with None + Fire & Smoke off.

Narrow (DevTools device toolbar, 390×844):

- [ ] Only menu button + search at top-left; panel opens full-map with "Map Options" header; sections expand on tap and several stay open; picking a pollutant leaves its section open; Settings section shows its label; X and Escape close; with a monitor detail panel open (bottom half), the options panel covers only the map half.

- [ ] **Step 8: Format and commit**

```bash
npm run format
git add src/lib/options/menus src/lib/MonitorMapLayout.svelte
git commit -m "Add pollutant, monitors, layers, overlays and settings menus"
```

---

### Task 10: Remove the old menu/legend and update exports

**Files:**

- Delete: the 11 files listed under "DELETE" in File Structure.
- Modify: `src/lib/index.ts`

- [ ] **Step 1: Confirm nothing else imports them**

Run: `grep -rnE "Menu\.svelte|DisplayOption\.svelte|DisplayOptions\.svelte|SegmentedControl|ToggleSwitch|MapLegend|MonitorMarkersLegend|HMSFireLegend|MapStyleDisplayOptions" src --include=*.svelte --include=*.ts | grep -v "src/lib/index.ts"`
Expected: matches only inside the files being deleted.

- [ ] **Step 2: Delete**

```bash
git rm src/lib/map/Menu.svelte src/lib/map/MapStyleDisplayOptions.svelte src/lib/components/DisplayOption.svelte src/lib/components/MapLayersDisplayOptions.svelte src/lib/components/SegmentedControl.svelte src/lib/components/ToggleSwitch.svelte src/lib/monitors/components/MonitorsDisplayOptions.svelte src/lib/monitors/components/MonitorMarkersLegend.svelte src/lib/ev-stations/components/EvStationsDisplayOptions.svelte src/lib/hms/components/HMSFireLegend.svelte src/lib/MapLegend.svelte
```

- [ ] **Step 3: Update `src/lib/index.ts`**

Replace

```ts
export { default as Menu } from "./map/Menu.svelte";
```

with nothing, and replace the block

```ts
export { default as MonitorsDisplayOptions } from "./monitors/components/MonitorsDisplayOptions.svelte";
export { default as EvStationsDisplayOptions } from "./ev-stations/components/EvStationsDisplayOptions.svelte";
export { default as MapLayersDisplayOptions } from "./components/MapLayersDisplayOptions.svelte";
export { default as MapStyleDisplayOptions } from "./map/MapStyleDisplayOptions.svelte";
export { default as ToggleSwitch } from "./components/ToggleSwitch.svelte";
export { default as SegmentedControl } from "./components/SegmentedControl.svelte";
```

with

```ts
// Options toolbar / panel (compose these inside MapShell's `menu` snippet)
export { default as OptionsBar } from "./options/OptionsBar.svelte";
export { default as OptionsGroup } from "./options/OptionsGroup.svelte";
export { default as OptionsMenu } from "./options/OptionsMenu.svelte";
export { default as CheckboxRow } from "./options/rows/CheckboxRow.svelte";
export { default as RadioRow } from "./options/rows/RadioRow.svelte";
export { default as SubmenuRow } from "./options/rows/SubmenuRow.svelte";
export { default as GroupRow } from "./options/rows/GroupRow.svelte";
export { default as MarkerIcon } from "./options/rows/MarkerIcon.svelte";
export { default as PollutantMenu } from "./options/menus/PollutantMenu.svelte";
export { default as MonitorsMenu } from "./options/menus/MonitorsMenu.svelte";
export { default as LayersMenu } from "./options/menus/LayersMenu.svelte";
export { default as OverlaysMenu } from "./options/menus/OverlaysMenu.svelte";
export { default as SettingsMenu } from "./options/menus/SettingsMenu.svelte";
export { resetMapOptions } from "./options/reset-map-options";
export { mapStyleState } from "./map/map-style-state.svelte.js";
export type { MapStyleState } from "./map/map-style-state.svelte.js";

// Legend
export { default as Legend } from "./legend/Legend.svelte";
export { default as LegendBar } from "./legend/LegendBar.svelte";
export {
	pollutantLegendSection,
	fireSmokeLegendSections,
	type LegendSection,
	type LegendBarData,
	type LegendCategory
} from "./legend/legend-data";
export { FIRE_LEGEND_CATEGORIES } from "./hms/hms-fire-icon-manager";
export { SMOKE_LEGEND } from "./hms/hms-smoke-map-integration.svelte";
```

- [ ] **Step 4: Full verification**

Run: `npm run check && npm run lint && npm test && npm run build && npm run build:lib`
Expected: all succeed. Then confirm the package output:
Run: `ls dist/lib/options dist/lib/legend && ls dist/lib | grep -c tests`
Expected: the new components are listed; the `grep -c` prints `0` (tests don't ship).

Confirm the production CSS kept the new layout rules after `@scope (#SJVAirMonitorMap)` wrapping:
Run: `grep -o "group-hover\\\\/menu" dist/monitor-map/*.css | head -1 && grep -c "max-md" dist/monitor-map/*.css`
Expected: one `group-hover\/menu` match and a non-zero `max-md` count. The dev-server checklist from Task 9 Step 7 is the behavioral check.

- [ ] **Step 5: Format and commit**

```bash
npm run format
git add src/lib/index.ts
git commit -m "Remove old display-options menu and legend components"
```

---

### Task 11: Update CLAUDE.md (not committed)

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Document the new structure**

In `CLAUDE.md`:

- Add `npm test           # Vitest (pure logic in tests/**)` to the Commands block and replace "No test framework is configured." with "Vitest covers the pure modules (`legend-data`, `group-state`, `pollutant-param`, `basemap`, `map-option-defaults`, `monitor-groups`); specs live in top-level `tests/` so they never ship in the package."
- In "Modularization: `MapShell` vs `MonitorMapLayout`", replace "the full display-options menu" with "the options toolbar/panel (`src/lib/options/`) and legend (`src/lib/legend/`)", and add: "`MapShell`'s `menu` snippet renders inside `OptionsBar` — compose `OptionsGroup`/`OptionsMenu`/row components there; its `search` snippet is placed in the toolbar. The toolbar vs. full-screen panel switch is pure CSS at Tailwind `md`; only `isWideLayout()` (`src/lib/options/layout.ts`) is read at click time."
- Add under "Monitor Data Flow": "Pollutant **None** is not a `monitorsManager.pollutant` value: it disables `monitorsMapIntegration` (URL `?pollutant=none`); see `src/lib/options/pollutant-param.ts`."

- [ ] **Step 2: Leave uncommitted**

Do **not** `git add` `CLAUDE.md` (the user commits `.md` files themselves). Mention the change in the final summary.
