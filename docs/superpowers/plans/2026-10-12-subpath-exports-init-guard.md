# Subpath Exports and Guarded `init()` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a host app load `@sjvair/monitor-map` at startup without maplibre, and make `monitorsManager.init()` safe to call from more than one place.

**Architecture:** Two new pure re-export entry files (`core.ts`, `lazy-routes.ts`) exposed as `./core` and `./routes` subpath exports; `.` is untouched. `MonitorsManager.init()` shares one in-flight promise, resolves conflicting pollutants by rule, and fetches latest readings in parallel. A separate small PR renames `map.svelte.ts` to end the macOS case collision.

**Tech Stack:** Svelte 5 runes, TypeScript, `svelte-package`, sv-router 0.19, Vitest 5, Vite 8 (rolldown).

**Spec:** `docs/superpowers/specs/2026-10-12-subpath-exports-init-guard-design.md`

## Global Constraints

- Target release 4.1.0 (minor). Nothing is removed from or changed on the `.` entry.
- `src/lib/routes.ts` and the widget (`src/router.ts`, `src/App.svelte`) stay eager and unedited.
- `core.ts` must never reach `@maptiler/sdk`, `@maptiler/weather` or `uplot` at runtime.
- Lazy route components must be literal `() => import("./X.svelte")` with no wrapper.
- Code style: tabs, double quotes, no trailing commas, 100-column width. Import rune modules with the full extension (`./foo.svelte.js`).
- Never commit `.md` files: leave README, CLAUDE.md, the spec and this plan modified or untracked in the working tree for the user to commit. Never stage `map.prompt.txt`.
- No AI attribution in commits, PR text or docs.
- Never create a GitHub release, run `npm publish`, or trigger the release workflow. This plan ends at open PRs.
- Do not edit `../mobile`.
- Part 2 runs on the existing branch `feat/subpath-exports-init-guard`. Part 1 runs on a new branch `fix/map-module-case-collision` cut from `main`.
- Merge order: Part 1's PR first, then Part 2's PR (which carries the 4.1.0 bump).

## Review Focus

Each line is pinned by a test in the task named in brackets.

1. `init()` called with a non-pollutant value (`"none"`, `true`, a number): must fall back to `meta.default_pollutant`, never record it. [Task 2]
2. A failed `init("o3")` followed by a plain `init()`: the retry must not inherit `"o3"`. [Task 2]
3. The latest-readings request failing while list and meta succeed: `init()` rejects, `initialized` stays false, and a retry works. [Task 2]
4. The layout mounting while a host's background init already has polling active: no extra list request. [Task 3]
5. The `exports` map pointing at files that do not exist in `dist/lib`, or the lazy routes losing their `() => import(` shape after minification (sv-router would then treat them as components). [Task 4]

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `vitest.config.ts` | modify | add the Svelte plugin so rune modules compile in tests |
| `tests/monitors/monitors-manager.test.ts` | create | unit tests for `init()` and `resumeAutoUpdate()` |
| `src/lib/monitors/monitors.svelte.ts` | modify | in-flight guard, pollutant rule, parallel latest, `resumeAutoUpdate()` |
| `src/lib/MonitorMapLayout.svelte` | modify | call `resumeAutoUpdate()` on mount |
| `src/lib/core.ts` | create | light entry: router context and `monitorsManager` |
| `src/lib/lazy-routes.ts` | create | lazy `monitorMapRoutes` |
| `src/lib/index.ts` | modify | usage comment only |
| `package.json` | modify | `./core` and `./routes` exports, `test:bundle` script, version |
| `tests/bundle/check-bundle.mjs` | create | proves the new entries keep maplibre off the eager path |
| `.github/workflows/release-package.yml` | modify | run tests and the bundle check before publishing |
| `README.md`, `CLAUDE.md` | modify, uncommitted | document the entries, the guard, the checks |
| `src/lib/map/map.svelte.ts` → `map-manager.svelte.ts` | rename (Part 1) | end the case collision with `Map.svelte` |

---

# Part 1: branch `fix/map-module-case-collision`

Done first: it is small, mechanical, and its PR merges first. It shares no lines with Part 2. Uncommitted `.md` edits stay in the working tree across branch switches, which is fine.

### Task 1: Rename `map.svelte.ts` to `map-manager.svelte.ts`

**Files:**
- Rename: `src/lib/map/map.svelte.ts` → `src/lib/map/map-manager.svelte.ts`
- Modify: the 19 files that import it (20 import lines), listed in Step 3
- Modify: `src/lib/map/MapShell.svelte` (one comment)
- Modify (leave uncommitted): `CLAUDE.md`

**Interfaces:**
- Consumes: nothing from Part 2.
- Produces: the module at `$lib/map/map-manager.svelte.js` with the same exports (`mapManager`, `DefaultMapStyle`, `initializeMap`, type `MapManager`). `src/lib/index.ts` keeps exporting the same names, so the package API is unchanged.

- [ ] **Step 1: Create the branch from an up-to-date `main`**

```bash
git switch main && git pull --ff-only && git switch -c fix/map-module-case-collision
```

- [ ] **Step 2: Write the collision check and see it fail**

This finds any compiled rune module whose extensionless import path matches a sibling file case-insensitively.

Run:

```bash
npm run build:lib && find dist/lib -name "*.svelte.js" | while read -r f; do ls "$(dirname "$f")" | grep -ix "$(basename "$f" .js)" | sed "s|^|$(dirname "$f")/|"; done
```

Expected: prints `dist/lib/map/Map.svelte` (the component that `./map.svelte` collides with).

- [ ] **Step 3: Rename the module and update its importers**

```bash
git mv src/lib/map/map.svelte.ts src/lib/map/map-manager.svelte.ts
grep -rlE '(map/|"\./|"\.\./)map\.svelte"' src | xargs sed -i -E 's#(map/|"\./|"\.\./)map\.svelte"#\1map-manager.svelte.js"#g'
sed -i 's#see initializeMap in map\.svelte\.ts#see initializeMap in map-manager.svelte.ts#' src/lib/map/MapShell.svelte
```

The files changed must be exactly these 19:

```
src/lib/index.ts                                          (2 lines)
src/lib/collocation-sites/collocations-map-integration.svelte.ts
src/lib/ev-stations/ev-stations-cluster-renderer.ts
src/lib/ev-stations/ev-stations-map-integration.svelte.ts
src/lib/hms/hms-fire-map-integration.svelte.ts
src/lib/hms/hms-smoke-map-integration.svelte.ts
src/lib/map/Map.svelte
src/lib/map/MapShell.svelte                               (import + comment)
src/lib/map/map-style-state.svelte.ts
src/lib/map/integrations/click-manager.ts
src/lib/map/integrations/map-geojson-integration.svelte.ts
src/lib/map/integrations/map-icon-manager.ts
src/lib/map/integrations/map-layer-integration.svelte.ts
src/lib/map/integrations/tooltip.svelte.ts
src/lib/monitors/monitors-cluster-renderer.ts
src/lib/monitors/monitors-icon-manager.svelte.ts
src/lib/monitors/monitors-map-integration.svelte.ts
src/lib/monitors/components/MonitorClusterTooltip.svelte
src/lib/search/Search.svelte
```

Each import now ends in `map-manager.svelte.js"`, for example `from "$lib/map/map-manager.svelte.js"`, `from "./map-manager.svelte.js"` or `from "../map-manager.svelte.js"`.

- [ ] **Step 4: Confirm no reference to the old name remains**

Run: `grep -rnE 'map\.svelte("|\.ts|\.js)' src tests; git status --short | grep -v '\.md$' | grep -v map.prompt.txt | wc -l`
Expected: the `grep` prints nothing (`Map.svelte` with a capital M does not match); the count is 20 (19 modified files plus the rename).

- [ ] **Step 5: Run the collision check to verify it passes**

Run:

```bash
npm run build:lib && find dist/lib -name "*.svelte.js" | while read -r f; do ls "$(dirname "$f")" | grep -ix "$(basename "$f" .js)" | sed "s|^|$(dirname "$f")/|"; done; ls dist/lib/map | grep -i "^map"
```

Expected: the check prints nothing; the listing shows `Map.svelte`, `Map.svelte.d.ts`, `map-manager.svelte.js`, `map-manager.svelte.d.ts`, `map-style-state.svelte.js`, `map-style-state.svelte.d.ts`, `MapShell.svelte`, `MapShell.svelte.d.ts`, and no `map.svelte.js`.

- [ ] **Step 6: Full verification**

Run: `npx prettier --write src/lib && npm run check && npm run lint && npm test && npm run build`
Expected: `prettier` changes nothing beyond the files already modified; 0 type errors; lint clean; all test files pass; the widget build succeeds.

- [ ] **Step 7: CLAUDE.md: remove the resolved known issue (leave uncommitted)**

In `CLAUDE.md`:

- Delete the whole "**Case-insensitive name collision in `src/lib/map/`:**" bullet from "Known issues".
- In "Library Packaging", delete the bullet beginning "Until the macOS name collision below is fixed".

The Code Style rule about never giving a component and a `.svelte.ts` module the same base name stays.

- [ ] **Step 8: Commit**

```bash
git add src/lib
git commit -m "fix: rename map.svelte.ts so it no longer collides with Map.svelte on macOS"
git status --short
```

Expected status: only `.md` files and `map.prompt.txt` remain. Tell the user which `CLAUDE.md` edits belong to this PR (Step 7) and which to Part 2 (Task 6, Steps 2-3).

- [ ] **Step 9: Push and open the PR**

```bash
git push -u origin fix/map-module-case-collision
gh pr create --base main --title "fix: rename map.svelte.ts to end the macOS case collision" --body "$(cat <<'EOF'
## What
Renames `src/lib/map/map.svelte.ts` to `map-manager.svelte.ts` and updates its 19 importers to the full `map-manager.svelte.js` extension.

## Why
`./map.svelte` resolves to the `Map.svelte` component on case-insensitive filesystems (macOS, the iOS CI runner), which fails with `MISSING_EXPORT mapManager`. Consumers needed a resolver workaround.

## Compatibility
Non-breaking: `exports` blocks deep imports, and the package root exports the same names (`mapManager`, `DefaultMapStyle`, `initializeMap`, `MapManager`).

## Verification
`npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm run build:lib`; no rune module in `dist/lib` shares a case-insensitive name with a sibling component.

Ships in 4.1.0 with the subpath-exports PR; merge this one first.
EOF
)"
```

Expected: the PR URL is printed. Do not create a release.

---

# Part 2: branch `feat/subpath-exports-init-guard`

Confirm the branch before starting:

```bash
git switch feat/subpath-exports-init-guard && git status --short
```

Expected: only untracked or modified docs (`docs/superpowers/...`, `CLAUDE.md`) and the untracked `map.prompt.txt`.

### Task 2: In-flight guard, pollutant rule and parallel latest fetch

**Files:**
- Modify: `vitest.config.ts`
- Create: `tests/monitors/monitors-manager.test.ts`
- Modify: `src/lib/monitors/monitors.svelte.ts` (the `init` method and the fields above the constructor)

**Interfaces:**
- Consumes: `getMonitors(pollutant)`, `getMonitorsList()`, `getMonitorsMeta()` from `@sjvair/sdk`; `MonitorsPollutant` (`"pm25" | "o3"`) from `./types`.
- Produces: `monitorsManager.init(urlPollutant?: string | number | boolean): Promise<void>`, same signature as before, now idempotent while in flight.

- [ ] **Step 1: Add the Svelte plugin to `vitest.config.ts`**

Replace the file with:

```ts
import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath, URL } from "node:url";

// Separate from vite.config.ts, which requires PROD_MODE for any non-development mode.
// The Svelte plugin compiles rune modules (*.svelte.ts) imported by specs.
export default defineConfig({
	plugins: [svelte()],
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

- [ ] **Step 2: Confirm the existing suite still passes**

Run: `npm test`
Expected: 7 test files pass.

- [ ] **Step 3: Write the failing tests**

Create `tests/monitors/monitors-manager.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import type { MonitorsManager } from "$lib/monitors/monitors.svelte";

const sdk = vi.hoisted(() => ({
	getMonitors: vi.fn(),
	getMonitorsList: vi.fn(),
	getMonitorsMeta: vi.fn()
}));
vi.mock("@sjvair/sdk", () => sdk);

const LIST = [{ id: "a" }];
const META = { default_pollutant: "pm25" };
const readings = (pollutant: string) => [{ id: "a", pollutant }];

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

// Lets every already-resolved promise chain run before the next assertion.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

let manager: MonitorsManager;
let start: MockInstance;

beforeEach(async () => {
	sdk.getMonitorsList.mockReset().mockResolvedValue(LIST);
	sdk.getMonitorsMeta.mockReset().mockResolvedValue(META);
	sdk.getMonitors.mockReset().mockImplementation(async (pollutant: string) => readings(pollutant));

	// A fresh module per test: monitorsManager is a module-level singleton.
	vi.resetModules();
	manager = (await import("$lib/monitors/monitors.svelte")).monitorsManager;
	start = vi.spyOn(manager.autoUpdate, "start");
});

afterEach(() => {
	manager.autoUpdate.stop();
});

describe("monitorsManager.init", () => {
	it("shares one run between overlapping calls", async () => {
		const first = manager.init();
		const second = manager.init();

		expect(second).toBe(first);
		await Promise.all([first, second]);

		expect(sdk.getMonitorsList).toHaveBeenCalledTimes(1);
		expect(sdk.getMonitorsMeta).toHaveBeenCalledTimes(1);
		expect(sdk.getMonitors.mock.calls).toEqual([["pm25"]]);
		expect(start).toHaveBeenCalledTimes(1);
		expect(manager.initialized).toBe(true);
		expect(manager.list).toEqual(LIST);
		expect(manager.pollutant).toBe("pm25");
	});

	it("lets an explicit pollutant win over an earlier call without one", async () => {
		await Promise.all([manager.init(), manager.init("o3")]);

		expect(manager.pollutant).toBe("o3");
		expect(manager.latest?.get("a")).toEqual({ id: "a", pollutant: "o3" });
		expect(sdk.getMonitorsList).toHaveBeenCalledTimes(1);
	});

	it("lets an explicit pollutant win over a later call without one", async () => {
		await Promise.all([manager.init("o3"), manager.init()]);

		expect(manager.pollutant).toBe("o3");
		expect(sdk.getMonitors.mock.calls).toEqual([["o3"]]);
	});

	it("uses the most recent of two explicit pollutants", async () => {
		await Promise.all([manager.init("pm25"), manager.init("o3")]);

		expect(manager.pollutant).toBe("o3");
		expect(manager.latest?.get("a")).toEqual({ id: "a", pollutant: "o3" });
	});

	it("refetches once when an explicit pollutant arrives mid-run", async () => {
		const list = deferred<typeof LIST>();
		const defaultReadings = deferred<ReturnType<typeof readings>>();
		const explicitReadings = deferred<ReturnType<typeof readings>>();
		sdk.getMonitorsList.mockReturnValue(list.promise);
		sdk.getMonitors
			.mockReturnValueOnce(defaultReadings.promise)
			.mockReturnValueOnce(explicitReadings.promise);

		const run = manager.init();
		await flush();
		expect(sdk.getMonitors.mock.calls).toEqual([["pm25"]]);

		manager.init("o3");
		list.resolve(LIST);
		defaultReadings.resolve(readings("pm25"));
		await flush();

		expect(sdk.getMonitors.mock.calls).toEqual([["pm25"], ["o3"]]);
		expect(manager.initialized).toBe(false);

		explicitReadings.resolve(readings("o3"));
		await run;

		expect(manager.initialized).toBe(true);
		expect(manager.pollutant).toBe("o3");
		expect(manager.latest?.get("a")).toEqual({ id: "a", pollutant: "o3" });
		expect(sdk.getMonitorsList).toHaveBeenCalledTimes(1);
	});

	it("requests an explicit pollutant's readings without waiting for the list", async () => {
		const list = deferred<typeof LIST>();
		sdk.getMonitorsList.mockReturnValue(list.promise);

		const run = manager.init("o3");
		expect(sdk.getMonitors.mock.calls).toEqual([["o3"]]);

		list.resolve(LIST);
		await run;
	});

	it("requests the default pollutant's readings once meta arrives, without the list", async () => {
		const list = deferred<typeof LIST>();
		sdk.getMonitorsList.mockReturnValue(list.promise);

		const run = manager.init();
		await flush();
		expect(sdk.getMonitors.mock.calls).toEqual([["pm25"]]);
		expect(manager.initialized).toBe(false);

		list.resolve(LIST);
		await run;
		expect(manager.initialized).toBe(true);
	});

	it.each(["none", "pm10", true, 42, undefined])(
		"falls back to the default pollutant for %s",
		async (value) => {
			await manager.init(value);

			expect(manager.pollutant).toBe("pm25");
			expect(sdk.getMonitors.mock.calls).toEqual([["pm25"]]);
		}
	);

	it("can be retried after the list request fails", async () => {
		sdk.getMonitorsList.mockRejectedValueOnce(new Error("offline"));

		await expect(manager.init()).rejects.toThrow("offline");
		expect(manager.initialized).toBe(false);
		expect(start).not.toHaveBeenCalled();

		await manager.init();
		expect(manager.initialized).toBe(true);
		expect(sdk.getMonitorsList).toHaveBeenCalledTimes(2);
		expect(start).toHaveBeenCalledTimes(1);
	});

	it("can be retried after the latest-readings request fails", async () => {
		sdk.getMonitors.mockRejectedValueOnce(new Error("latest failed"));

		await expect(manager.init()).rejects.toThrow("latest failed");
		expect(manager.initialized).toBe(false);

		await manager.init();
		expect(manager.initialized).toBe(true);
	});

	it("does not carry a failed run's pollutant into the retry", async () => {
		sdk.getMonitorsList.mockRejectedValueOnce(new Error("offline"));

		await expect(manager.init("o3")).rejects.toThrow("offline");
		await manager.init();

		expect(manager.pollutant).toBe("pm25");
	});

	it("does nothing once initialized", async () => {
		await manager.init();
		sdk.getMonitorsList.mockClear();
		sdk.getMonitorsMeta.mockClear();
		sdk.getMonitors.mockClear();

		await manager.init("o3");

		expect(sdk.getMonitorsList).not.toHaveBeenCalled();
		expect(sdk.getMonitorsMeta).not.toHaveBeenCalled();
		expect(sdk.getMonitors).not.toHaveBeenCalled();
		expect(manager.pollutant).toBe("pm25");
		expect(start).toHaveBeenCalledTimes(1);
	});
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npx vitest run tests/monitors/monitors-manager.test.ts`
Expected: FAIL. "shares one run between overlapping calls" fails because the two calls return different promises, and the overlapping-call and parallel-fetch cases fail with it. The five fallback rows and "does nothing once initialized" already pass against the old code; that is fine.

- [ ] **Step 5: Implement the guard**

In `src/lib/monitors/monitors.svelte.ts`:

Change the types import line to also bring in `MonitorsPollutant`:

```ts
import type { MonitorsDataSource, MonitorsPollutant } from "./types";
```

Add two private fields directly above `constructor() {`:

```ts
	#initPromise: Promise<void> | null = null;
	#requestedPollutant: MonitorsPollutant | null = null;
```

Replace the whole `async init(...) { ... }` method with:

```ts
	/**
	 * Safe to call from several places: overlapping calls share one run, and a failed run can
	 * be retried. An explicit "pm25"/"o3" wins over a call without one, whichever came first;
	 * between two explicit values the most recent wins.
	 */
	init(urlPollutant?: string | number | boolean): Promise<void> {
		if (this.initialized) return Promise.resolve();

		if (urlPollutant === "pm25" || urlPollutant === "o3") {
			this.#requestedPollutant = urlPollutant;
		}

		this.#initPromise ??= this.#runInit().finally(() => {
			this.#initPromise = null;
			this.#requestedPollutant = null;
		});

		return this.#initPromise;
	}

	async #runInit(): Promise<void> {
		// The pollutant the latest readings were requested for.
		let fetchedPollutant = this.#requestedPollutant;

		const metaRequest = getMonitorsMeta();
		const listAndMeta = Promise.all([getMonitorsList(), metaRequest]).then(([list, meta]) => {
			this.list = list;
			this.meta = meta;
			return meta;
		});
		// The latest readings only need the pollutant, so they never wait for the list.
		const latestRequest = fetchedPollutant
			? getMonitorsLatestMap(fetchedPollutant)
			: metaRequest.then((meta) => {
					fetchedPollutant = meta.default_pollutant;
					return getMonitorsLatestMap(meta.default_pollutant);
				});

		// One Promise.all so a failure in either never leaves the other unhandled.
		const [meta, firstLatest] = await Promise.all([listAndMeta, latestRequest]);
		let latest = firstLatest;

		// An explicit pollutant may have arrived while the requests above were in flight.
		let wanted = this.#requestedPollutant ?? meta.default_pollutant;
		while (wanted !== fetchedPollutant) {
			latest = await getMonitorsLatestMap(wanted);
			fetchedPollutant = wanted;
			wanted = this.#requestedPollutant ?? meta.default_pollutant;
		}

		this.pollutant = fetchedPollutant;
		this.latest = latest;
		this.autoUpdate.start();
		this.initialized = true;
	}
```

Leave the constructor, `update()`, `getMonitorsLatestMap` and the exports as they are.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run tests/monitors/monitors-manager.test.ts`
Expected: PASS, 16 tests (11 single cases plus the 5 `it.each` rows), none skipped.

- [ ] **Step 7: Type-check, lint and run the whole suite**

Run: `npx prettier --write vitest.config.ts tests/monitors/monitors-manager.test.ts src/lib/monitors/monitors.svelte.ts && npm run check && npm run lint && npm test`
Expected: `svelte-check` reports 0 errors; lint is clean; 8 test files pass.

If `svelte-check` complains that `fetchedPollutant` may be `null` at `this.pollutant = fetchedPollutant`, that assignment is valid (`pollutant` is nullable); any other narrowing error means the code was not copied exactly.

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts tests/monitors/monitors-manager.test.ts src/lib/monitors/monitors.svelte.ts
git commit -m "fix: guard monitorsManager.init() against overlapping calls"
```

### Task 3: Resume live updates when the layout remounts

**Files:**
- Modify: `tests/monitors/monitors-manager.test.ts` (append a `describe` block)
- Modify: `src/lib/monitors/monitors.svelte.ts` (add a method after `#runInit`)
- Modify: `src/lib/MonitorMapLayout.svelte:64`

**Interfaces:**
- Consumes: Task 2's `init()`; `Interval#isActive`, `Interval#start()`, `Interval#stop()` from `@tstk/utils`; the existing `update(): Promise<void>`.
- Produces: `monitorsManager.resumeAutoUpdate(): void`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/monitors/monitors-manager.test.ts`:

```ts
describe("monitorsManager.resumeAutoUpdate", () => {
	it("does nothing before initialization", () => {
		manager.resumeAutoUpdate();

		expect(sdk.getMonitorsList).not.toHaveBeenCalled();
		expect(start).not.toHaveBeenCalled();
		expect(manager.autoUpdate.isActive).toBe(false);
	});

	it("does not refetch while polling is already active", async () => {
		await manager.init();
		sdk.getMonitorsList.mockClear();
		sdk.getMonitors.mockClear();

		manager.resumeAutoUpdate();
		await flush();

		expect(sdk.getMonitorsList).not.toHaveBeenCalled();
		expect(sdk.getMonitors).not.toHaveBeenCalled();
		expect(start).toHaveBeenCalledTimes(1);
	});

	it("refreshes once and restarts polling after it was stopped", async () => {
		await manager.init("o3");
		manager.autoUpdate.stop();
		sdk.getMonitorsList.mockClear();
		sdk.getMonitors.mockClear();

		manager.resumeAutoUpdate();
		await flush();

		expect(sdk.getMonitorsList).toHaveBeenCalledTimes(1);
		expect(sdk.getMonitors.mock.calls).toEqual([["o3"]]);
		expect(manager.autoUpdate.isActive).toBe(true);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/monitors/monitors-manager.test.ts -t resumeAutoUpdate`
Expected: FAIL with `manager.resumeAutoUpdate is not a function`.

- [ ] **Step 3: Implement `resumeAutoUpdate`**

In `src/lib/monitors/monitors.svelte.ts`, add directly after the `#runInit` method:

```ts
	/**
	 * Restarts polling after something stopped it (MonitorMapLayout stops it on destroy),
	 * refreshing first since the data may be stale. A no-op before init or while polling.
	 */
	resumeAutoUpdate(): void {
		if (!this.initialized || this.autoUpdate.isActive) return;

		this.update().catch(console.error);
		this.autoUpdate.start();
	}
```

- [ ] **Step 4: Call it from the layout**

In `src/lib/MonitorMapLayout.svelte`, change

```ts
	monitorsManager.init(route.search.pollutant);
	collocationSitesManager.init();
```

to

```ts
	monitorsManager.init(route.search.pollutant);
	// A previous instance of this layout stopped polling in onDestroy; init() is a no-op by now.
	monitorsManager.resumeAutoUpdate();
	collocationSitesManager.init();
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/monitors/monitors-manager.test.ts`
Expected: PASS, including the three new tests.

- [ ] **Step 6: Type-check and lint**

Run: `npx prettier --write tests/monitors/monitors-manager.test.ts src/lib/monitors/monitors.svelte.ts src/lib/MonitorMapLayout.svelte && npm run check && npm run lint`
Expected: 0 errors, lint clean.

- [ ] **Step 7: Commit**

```bash
git add tests/monitors/monitors-manager.test.ts src/lib/monitors/monitors.svelte.ts src/lib/MonitorMapLayout.svelte
git commit -m "fix: resume live updates when the map layout remounts"
```

### Task 4: `./core` and `./routes` entries with a bundle check

**Files:**
- Create: `tests/bundle/check-bundle.mjs`
- Create: `src/lib/core.ts`
- Create: `src/lib/lazy-routes.ts`
- Modify: `package.json` (`scripts`, `exports`)
- Modify: `src/lib/index.ts` (the usage comment at the top only)

**Interfaces:**
- Consumes: `./router-context`, `./monitors/monitors.svelte.js`, `./monitors/types`, and the three route components.
- Produces: package subpaths `@sjvair/monitor-map/core` and `@sjvair/monitor-map/routes`; npm script `test:bundle`.

- [ ] **Step 1: Write the bundle check**

Create `tests/bundle/check-bundle.mjs`:

```js
// Proves the light entries stay light: bundles each one from dist/lib the way a host app
// would and fails if maplibre is reachable without a dynamic import. Run through
// `npm run test:bundle`, which builds dist/lib first.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { enhancedImages } from "@sveltejs/enhanced-img";

const root = fileURLToPath(new URL("../../", import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

const HEAVY = /maplibre/i;
// The shape sv-router's isLazyImport() looks for; it must survive minification.
const LAZY_IMPORT = /\(\)\s?=>\s?import\(/g;
const FIXTURE = "virtual:bundle-check";

const failures = [];

function entryFile(subpath) {
	const entry = pkg.exports[subpath];
	if (!entry) {
		failures.push(`package.json has no "${subpath}" export`);
		return null;
	}
	for (const condition of ["svelte", "types", "default"]) {
		if (!entry[condition]) {
			failures.push(`"${subpath}" export has no "${condition}" condition`);
		} else if (!existsSync(resolve(root, entry[condition]))) {
			failures.push(`"${subpath}" export's "${condition}" file is missing: ${entry[condition]}`);
		}
	}
	return entry.svelte ? resolve(root, entry.svelte) : null;
}

// Bundles a module that imports everything from `files`, and splits the output chunks into
// those loaded up front (the entry and its static imports) and those behind a dynamic import.
async function bundle(files) {
	const code =
		files.map((file, i) => `import * as m${i} from ${JSON.stringify(file)};`).join("\n") +
		`\nglobalThis.__keep = [${files.map((_, i) => `m${i}`).join(", ")}];\n`;

	const result = await build({
		configFile: false,
		root,
		logLevel: "error",
		plugins: [
			{
				name: "bundle-check-fixture",
				resolveId: (id) => (id === FIXTURE ? "\0" + FIXTURE : null),
				load: (id) => (id === "\0" + FIXTURE ? code : null)
			},
			enhancedImages(),
			svelte()
		],
		build: { write: false, rolldownOptions: { input: FIXTURE } }
	});

	const output = (Array.isArray(result) ? result[0] : result).output;
	const chunks = output.filter((item) => item.type === "chunk");
	const byName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));

	const eagerNames = new Set();
	const queue = chunks.filter((chunk) => chunk.isEntry).map((chunk) => chunk.fileName);
	while (queue.length > 0) {
		const name = queue.pop();
		if (eagerNames.has(name)) continue;
		eagerNames.add(name);
		queue.push(...byName.get(name).imports);
	}

	return {
		eager: chunks.filter((chunk) => eagerNames.has(chunk.fileName)),
		lazy: chunks.filter((chunk) => !eagerNames.has(chunk.fileName))
	};
}

const size = (chunks) => chunks.reduce((total, chunk) => total + chunk.code.length, 0);
const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

const core = entryFile("./core");
const routes = entryFile("./routes");

if (core) {
	const { eager } = await bundle([core]);
	console.log(`./core            eager ${kb(size(eager))}`);
	if (eager.some((chunk) => HEAVY.test(chunk.code))) {
		failures.push('"./core" pulls maplibre into the startup bundle');
	}
}

if (core && routes) {
	const { eager, lazy } = await bundle([core, routes]);
	console.log(`./core + ./routes eager ${kb(size(eager))}, lazy ${kb(size(lazy))}`);
	if (eager.some((chunk) => HEAVY.test(chunk.code))) {
		failures.push('"./core" + "./routes" pull maplibre into the startup bundle');
	}
	// Guards the check itself: if maplibre is in no chunk at all, HEAVY is matching nothing.
	if (!lazy.some((chunk) => HEAVY.test(chunk.code))) {
		failures.push("no lazy chunk contains maplibre, so this check cannot detect it");
	}
	const lazyImports = eager.flatMap((chunk) => chunk.code.match(LAZY_IMPORT) ?? []);
	if (lazyImports.length < 3) {
		failures.push(
			`expected the layout and both routes to stay \`() => import(...)\` in the startup ` +
				`bundle, found ${lazyImports.length}`
		);
	}
}

if (failures.length > 0) {
	console.error("\nBundle check failed:");
	for (const failure of failures) console.error(`  - ${failure}`);
	process.exit(1);
}

console.log("Bundle check passed.");
```

- [ ] **Step 2: Add the npm script**

In `package.json` `scripts`, after the `"test"` line (add a comma to the `"test"` line):

```json
		"test": "vitest run",
		"test:bundle": "npm run build:lib && node tests/bundle/check-bundle.mjs"
```

- [ ] **Step 3: Run the check to verify it fails**

Run: `npm run test:bundle`
Expected: `build:lib` succeeds (it prints an existing `import.meta.env` advisory, which is not an error), then the script exits 1 with:

```
Bundle check failed:
  - package.json has no "./core" export
  - package.json has no "./routes" export
```

- [ ] **Step 4: Create the light entry**

Create `src/lib/core.ts`:

```ts
/**
 * Light entry (`@sjvair/monitor-map/core`): what a host app needs at startup, without the map.
 *
 * Nothing imported here may reach @maptiler/sdk, @maptiler/weather or uplot at runtime;
 * `npm run test:bundle` enforces it. Everything is re-exported from the same modules the
 * main entry uses, so `monitorsManager` and the router context stay single instances
 * whichever entries a host mixes.
 */
export {
	ROUTER_KEY,
	provideMonitorMapRouter,
	useMonitorMapRouter,
	type MonitorMapRouterApi
} from "./router-context";
export { monitorsManager } from "./monitors/monitors.svelte.js";
export type { MonitorsManager } from "./monitors/monitors.svelte.js";
export type { MonitorsDataSource, MonitorsPollutant } from "./monitors/types";
```

- [ ] **Step 5: Create the lazy routes entry**

Create `src/lib/lazy-routes.ts`:

```ts
import type { Routes } from "sv-router";

/**
 * Lazy routes entry (`@sjvair/monitor-map/routes`): the same route tree as the main entry's
 * `monitorMapRoutes`, but the layout and every route load on demand, so a host router can
 * reference it at startup without loading the map.
 *
 * Each component must stay a literal `() => import(...)`: sv-router recognises lazy
 * components by matching the function's source text, so a helper wrapper would break it.
 */
export const monitorMapRoutes: Routes = {
	layout: () => import("./MonitorMapLayout.svelte"),
	"/": () => import("./MainMapView.svelte"),
	"/monitor/:id": () => import("./MonitorDetailPanel.svelte")
};
```

- [ ] **Step 6: Add the subpath exports**

In `package.json`, replace the `exports` block with:

```json
	"exports": {
		".": {
			"svelte": "./dist/lib/index.js",
			"types": "./dist/lib/index.d.ts",
			"default": "./dist/lib/index.js"
		},
		"./core": {
			"svelte": "./dist/lib/core.js",
			"types": "./dist/lib/core.d.ts",
			"default": "./dist/lib/core.js"
		},
		"./routes": {
			"svelte": "./dist/lib/lazy-routes.js",
			"types": "./dist/lib/lazy-routes.d.ts",
			"default": "./dist/lib/lazy-routes.js"
		}
	},
```

- [ ] **Step 7: Update the usage comment in `src/lib/index.ts`**

Insert these lines into the top doc comment, directly before its closing ` */`:

```ts
 *
 * A host that must stay light at startup imports from the subpath entries instead:
 * `provideMonitorMapRouter`/`monitorsManager` from "@sjvair/monitor-map/core" (no map), and
 * `monitorMapRoutes` from "@sjvair/monitor-map/routes" (same tree, lazy layout and routes).
 * `monitorMapRoutes` from this entry stays eager.
```

Change nothing else in the file.

- [ ] **Step 8: Run the check to verify it passes**

Run: `npm run test:bundle`
Expected: exit 0, ending with lines close to:

```
./core            eager 21 KB
./core + ./routes eager 59 KB, lazy 2196 KB
Bundle check passed.
```

Sizes may differ by a few KB. If the `./core` eager size is in the megabytes, something in `core.ts`'s graph imports the map: stop and find it rather than adjusting the check.

- [ ] **Step 9: Confirm the emitted declarations exist and are light**

Run: `cat dist/lib/core.d.ts dist/lib/lazy-routes.d.ts`
Expected: `core.d.ts` contains only the re-export lines; `lazy-routes.d.ts` declares `export declare const monitorMapRoutes: Routes;`.

- [ ] **Step 10: Type-check, lint and run the unit tests**

Run: `npx prettier --write tests/bundle/check-bundle.mjs src/lib/core.ts src/lib/lazy-routes.ts src/lib/index.ts package.json && npm run check && npm run lint && npm test`
Expected: 0 errors, lint clean, 8 test files pass.

- [ ] **Step 11: Commit**

```bash
git add tests/bundle/check-bundle.mjs src/lib/core.ts src/lib/lazy-routes.ts src/lib/index.ts package.json
git commit -m "feat: add light core and lazy routes subpath exports"
```

### Task 5: Run the checks in the release workflow

**Files:**
- Modify: `.github/workflows/release-package.yml`

**Interfaces:**
- Consumes: npm scripts `test` and `test:bundle` (Task 4). `test:bundle` runs `build:lib` itself.
- Produces: nothing other tasks use.

- [ ] **Step 1: Replace the build step**

In `.github/workflows/release-package.yml`, change

```yaml
      - run: npm ci
      - run: npm run build:lib
      - run: npm publish --access public --provenance
```

to

```yaml
      - run: npm ci
      - run: npm test
      # Builds dist/lib, then fails the release if the light entries reach maplibre.
      - run: npm run test:bundle
      - run: npm publish --access public --provenance
```

- [ ] **Step 2: Reproduce the workflow's steps locally**

Run: `npm test && npm run test:bundle && ls dist/lib/index.js dist/lib/core.js dist/lib/lazy-routes.js`
Expected: tests pass, the bundle check passes, and all three files are listed. Do not run `npm publish`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release-package.yml
git commit -m "ci: run tests and the bundle check before publishing"
```

### Task 6: Docs, version bump, final verification and PR

**Files:**
- Modify (leave uncommitted): `README.md`, `CLAUDE.md`
- Modify: `package.json`, `package-lock.json` (version only)

**Interfaces:**
- Consumes: everything above.
- Produces: an open PR for `feat/subpath-exports-init-guard`.

- [ ] **Step 1: README: document the entries**

In `README.md`, directly after the paragraph that ends "(the thin wrapper `monitorMapRoutes` points to)." and before "### Embedding `MapShell` directly", insert:

````markdown
### Keeping the map off a host app's startup path

The package root re-exports everything, and its `monitorMapRoutes` imports the map layout
eagerly, so referencing it in a router puts maplibre (about 2 MB) in the startup bundle. A
host whose first screen is not the map uses the two subpath entries instead:

```ts
// router.ts
import { createRouter } from "sv-router";
import { monitorMapRoutes } from "@sjvair/monitor-map/routes";

export const { route, navigate, p, isActive, Router } = createRouter({
	"/my-map": monitorMapRoutes
});
```

```svelte
<!-- app root -->
<script>
	import { provideMonitorMapRouter } from "@sjvair/monitor-map/core";
	import { route, navigate, p, isActive, Router } from "./router";

	provideMonitorMapRouter({ route, navigate, p, isActive, basePath: "/my-map" });
</script>

<Router />
```

- `@sjvair/monitor-map/core` exports the router context (`provideMonitorMapRouter`,
  `useMonitorMapRouter`, `ROUTER_KEY`, `MonitorMapRouterApi`) and `monitorsManager`, with
  no map code behind them.
- `@sjvair/monitor-map/routes` exports a `monitorMapRoutes` with the same route tree, whose
  layout and routes load on demand. On a cold deep link into the map, the router outlet is
  empty until that chunk arrives.

Both entries share their modules with the package root, so `monitorsManager` is the same
instance whichever entry it is imported from.

`monitorsManager.init()` may be called from several places (for example, a background
preload and the map layout): overlapping calls share one set of requests, a failed call can
be retried, and an explicit `"pm25"`/`"o3"` argument wins over a call without one.
````

- [ ] **Step 2: CLAUDE.md: commands and test coverage**

In `CLAUDE.md`, in the Commands block, change

```
npm test             # Vitest (pure logic in tests/**)
```

to

```
npm test             # Vitest (specs in tests/**)
npm run test:bundle  # build:lib, then check the light entries keep maplibre off the eager path
```

and replace the sentence beginning "Vitest covers the pure modules" with:

```markdown
Vitest covers the pure modules (`legend-data`, `group-state`, `pollutant-param`, `basemap`, `map-option-defaults`, `monitor-groups`) and `monitorsManager` (`tests/monitors/monitors-manager.test.ts`, with `@sjvair/sdk` mocked and the module re-imported per test); specs live in top-level `tests/` so they never ship in the package. `vitest.config.ts` loads the Svelte plugin so rune modules compile; they compile in server mode there, so `$effect`s do not run in specs.
```

- [ ] **Step 3: CLAUDE.md: entries and init rules**

In `CLAUDE.md`, directly before the line `## Library Packaging (`build:lib`)`, insert:

```markdown
### Package entries

`package.json` `exports` has three entries, all built by `svelte-package` into `dist/lib`:

- `.` (`src/lib/index.ts`) — everything; its `monitorMapRoutes` (`src/lib/routes.ts`) is
  eager. The widget build uses this.
- `./core` (`src/lib/core.ts`) — router context and `monitorsManager` only. Nothing it
  imports may reach `@maptiler/sdk`, `@maptiler/weather` or `uplot` at runtime.
- `./routes` (`src/lib/lazy-routes.ts`) — `monitorMapRoutes` with a lazy layout and lazy
  routes. Each must stay a literal `() => import("./X.svelte")`: sv-router detects lazy
  components by regex on the function source.

`core.ts` and `lazy-routes.ts` are pure re-exports/route tables of the modules `.` uses, so
the singletons stay single across entries. `npm run test:bundle`
(`tests/bundle/check-bundle.mjs`) bundles both entries from `dist/lib` and fails if maplibre
is reachable without a dynamic import, if an `exports` target is missing, or if the lazy
routes lose their shape; the release workflow runs it before publishing.

### `monitorsManager.init()` rules

`init()` is safe to call from several places. Overlapping calls share one promise; a
rejection clears it so a later call retries. An explicit `"pm25"`/`"o3"` wins over a call
without one regardless of order, and the most recent of two explicit values wins; if one
arrives mid-run the run refetches the latest readings before setting `initialized`. The
latest readings are requested in parallel with the list (chained off meta when no pollutant
was given). Once initialized, `init()` is a no-op and `MonitorMapLayout`'s URL effect
applies pollutant changes. `MonitorMapLayout` stops polling on destroy and calls
`monitorsManager.resumeAutoUpdate()` on mount, which refreshes once and restarts polling
only if it was stopped.
```

- [ ] **Step 4: Bump the version**

Run: `npm version 4.1.0 --no-git-tag-version`
Expected: prints `v4.1.0`; `git diff --stat` shows only the version lines in `package.json` and `package-lock.json` (plus the uncommitted docs).

- [ ] **Step 5: Bring in the rename, then run full verification**

The final verification must run against the rename and this work together.

- If the Part 1 PR is already merged: `git fetch origin && git rebase origin/main`, and verify on the rebased branch.
- If it is not merged yet: `git merge --no-commit --no-ff fix/map-module-case-collision`, run the verification below, then `git merge --abort` so this branch's history stays free of the rename. A conflict in either case contradicts the plan's analysis: stop and resolve it deliberately.

Run: `npm run check && npm run lint && npm test && npm run test:bundle && npm run build`
Expected:
- `svelte-check`: 0 errors.
- lint: clean (if Prettier flags `README.md` or `CLAUDE.md`, run `npx prettier --write README.md CLAUDE.md` and rerun).
- `npm test`: 8 files pass.
- `test:bundle`: `Bundle check passed.`
- `npm run build` (the widget): succeeds and writes `dist/monitor-map/sjvairMonitorMap.js`. This confirms the eager widget path still builds.

- [ ] **Step 6: Confirm `.` is unchanged**

Run: `git diff main -- src/lib/index.ts src/lib/routes.ts src/router.ts src/App.svelte`
Expected: the only diff is the added comment lines in `src/lib/index.ts`.

- [ ] **Step 7: Commit the bump**

```bash
git add package.json package-lock.json
git commit -m "chore: bump package version to 4.1.0"
git status --short
```

Expected status: only `.md` files (modified `README.md`, `CLAUDE.md`; untracked spec and plan) and untracked `map.prompt.txt` remain. Tell the user these docs are ready for them to commit to this branch.

- [ ] **Step 8: Push and open the PR**

```bash
git push -u origin feat/subpath-exports-init-guard
gh pr create --base main --title "feat: light core and lazy routes entries, guarded monitorsManager.init() (4.1.0)" --body "$(cat <<'EOF'
## What
- `@sjvair/monitor-map/core`: router context and `monitorsManager` without the map, for host-app startup.
- `@sjvair/monitor-map/routes`: `monitorMapRoutes` with a lazy layout and lazy routes.
- `monitorsManager.init()`: overlapping calls share one run; a failed init can be retried; an explicit pollutant wins over a call without one; latest readings load in parallel with the list.
- Live updates resume when the map layout remounts (`monitorsManager.resumeAutoUpdate()`).
- Release workflow runs `npm test` and `npm run test:bundle` before publishing.

The `.` entry and the widget build are unchanged.

## Why
In the mobile app the eager `monitorMapRoutes` put a ~2.2 MB maplibre chunk on the startup path, and its background `init()` could overlap the map layout's, fetching the monitor list twice and letting the later call overwrite the URL pollutant.

## Verification
- `npm test`: new `tests/monitors/monitors-manager.test.ts`.
- `npm run test:bundle`: `./core` bundles to ~21 KB eager; `./core` + `./routes` to ~60 KB eager with maplibre only in a lazy chunk.
- `npm run check`, `npm run lint`, `npm run build`.

Merge after the `fix/map-module-case-collision` PR. Not released: publishing 4.1.0 is a separate, explicit step.
EOF
)"
```

Expected: the PR URL is printed. Do not create a release.

---

## After both PRs

Stop here and report to the user:

- both PR URLs and the merge order (Part 1, then Part 2);
- the uncommitted `.md` files and which branch each belongs to;
- that publishing 4.1.0 needs their explicit go-ahead, with the draft release notes from the spec;
- that the downstream mobile-app change is a separate proposal, written after 4.1.0 is published.
