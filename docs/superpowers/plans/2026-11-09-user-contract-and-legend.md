# USER contract, login changes and the legend on a short map: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Document the `globalThis.USER` contract, let a host tell the map the user changed
(`monitorMapUserChanged()`), and stop the expanded legend covering Options and Search on a
short (phone) map.

**Architecture:** A small rune module, `src/lib/user.svelte.ts`, is the only reader of
`globalThis.USER`. It reads the global on every call, after reading a `$state` counter that
`monitorMapUserChanged()` bumps, so anything rendering from it re-runs after the call. The
legend card gets a `panelOpen` prop, a collapse rule driven by panel open/close transitions,
and a height cap from its wrapper in `MonitorMapLayout`.

**Tech Stack:** Svelte 5 runes, TypeScript, Tailwind v4, Vitest (server / client / browser
projects), Playwright for the phone-size screenshots.

**Spec:** `docs/superpowers/specs/2026-11-09-user-contract-and-legend-design.md`

## Global Constraints

- Base `release/5.0.0`; PRs into `release/5.0.0`. Never commit to or merge into `main`.
- Two PRs: `fix/user-contract` (Tasks 1–3, plus the spec and this plan, already on that
  branch) and `fix/legend-short-map` (Tasks 4–5, branched from `origin/release/5.0.0`).
- Merging, releasing and publishing each need the user's own explicit yes.
- No Claude or AI attribution in commits, PRs or docs; no `Co-Authored-By` trailer.
- The map never writes to `globalThis.USER`. It reads only `is_authenticated` and `api_token`.
- `./core` must stay free of map-engine imports; `npm run test:bundle` must pass.
- Don't modify map-sdk, mobile, sdk-js or sjvair.com. Don't touch `.worktrees/5.0-design`,
  `../old-monitor-map-v2`, `compare-5.0.html` or `compare-5.0/`.
- Code style: tabs, double quotes, no trailing commas, width 100; `npm run format` before each
  commit. Tailwind utilities, not `<style>` blocks.
- Never print the MapTiler or NREL keys.

## Review Focus

1. A host that never calls `monitorMapUserChanged` and sets `USER` before the panel mounts
   (sjvair.com) sees exactly today's behavior. Pinned by the existing panel spec (it sets the
   global, never calls the function) staying green in Task 2.
2. A host that edits a field of the existing `USER` object in place, then calls the function:
   the panel follows. Test in Task 2.
3. A user who collapses the legend themselves while the panel is open, then closes the panel:
   the legend stays collapsed. Test in Task 4.
4. A deep link to `/monitor/:id` on a phone: the legend mounts with the panel already open and
   must start collapsed. Test in Task 4.
5. A wide screen opening the panel: the legend doesn't change. Test in Task 4.

---

### Task 1: `user.svelte.ts` and the export

**Files:**
- Create: `src/lib/user.svelte.ts`
- Modify: `src/lib/monitors/subscriptions.ts` (`getApiToken` reads through `currentUser()`)
- Modify: `src/lib/index.ts`, `src/lib/core.ts` (export `monitorMapUserChanged`)
- Modify: `tests/bundle/check-bundle.mjs` (`CORE_EXPORTS` gains `monitorMapUserChanged`)
- Modify: `CLAUDE.md` ("Package entries": `.` and `./core` lists and the `test:bundle` list)
- Test: `tests/user.test.ts` (server project; plain reads, no effects needed)
- Test: `tests/monitors/subscriptions.test.ts` (existing; must stay green unchanged)

**Interfaces:**
- Produces, from `src/lib/user.svelte.ts`:
  - `currentUser(): { is_authenticated?: unknown; api_token?: unknown } | undefined`: reads the
    `$state` version counter, then returns `globalThis.USER` if it is a non-null object,
    otherwise `undefined`.
  - `isAuthenticated(): boolean`: `Boolean(currentUser()?.is_authenticated)`.
  - `monitorMapUserChanged(): void`: increments the counter.
- `getApiToken()` keeps its signature and rules (non-empty string or `undefined`).

- [ ] **Step 1: Write `tests/user.test.ts`**

  - `currentUser()` is `undefined` with no `USER`, and with `USER = null`.
  - `currentUser()` returns the same object as `globalThis.USER` when set.
  - `isAuthenticated()` is `false` with no `USER`, `false` for `{ is_authenticated: false }`,
    `true` for `{ is_authenticated: true }`.
  - After replacing `USER` and calling `monitorMapUserChanged()`, `isAuthenticated()` reflects
    the new object (a plain read; reactivity is covered in Task 2).
  - `afterEach` deletes `globalThis.USER`.

- [ ] **Step 2: Run it; expect failure** (module missing)

  Run: `npx vitest run tests/user.test.ts` → FAIL, cannot resolve `$lib/user.svelte.js`.

- [ ] **Step 3: Implement `src/lib/user.svelte.ts`**, then make `getApiToken()` use
  `currentUser()?.api_token`. Add `export { monitorMapUserChanged } from "./user.svelte.js";`
  to `index.ts` and `core.ts`, with a one-line doc comment on the function: call after changing
  `globalThis.USER` while the map is showing.

- [ ] **Step 4: Update `CORE_EXPORTS` in `tests/bundle/check-bundle.mjs`** and the export lists
  in CLAUDE.md's "Package entries" (both the `.`/`./core` bullets and the `test:bundle`
  sentence).

- [ ] **Step 5: Verify**

  Run: `npx vitest run tests/user.test.ts tests/monitors/subscriptions.test.ts` → PASS.
  Run: `npm run test:bundle` → passes, `./core` exports listed include `monitorMapUserChanged`.
  Run: `npm run check` → 0 errors.

- [ ] **Step 6: Commit**: `feat: monitorMapUserChanged() tells the map the logged-in user changed`

### Task 2: The panel follows a user change

**Files:**
- Modify: `src/lib/MonitorDetailPanel.svelte` (~line 210)
- Test: `tests/browser/monitor-detail-panel.test.ts`

**Interfaces:**
- Consumes: `isAuthenticated()`, `monitorMapUserChanged()` from `$lib/user.svelte.js`;
  `getApiToken()` from `$lib/monitors/subscriptions` (mocked to `"t"` in this spec file).

- [ ] **Step 1: Add failing specs** in a `describe("logged-in user")` block (the spec file's
  existing `afterEach` deletes `USER`; also call `monitorMapUserChanged()` there so a bumped
  counter can't leak):
  - "hides the subscribe control after logout": `USER = { is_authenticated: true,
    api_token: "t" }`, render, expect "Subscribe to Alerts" visible; set
    `USER = { is_authenticated: false }`, call `monitorMapUserChanged()`, expect the button
    gone.
  - "shows it after login": start with `USER = { is_authenticated: false }`, expect no button;
    replace with an authenticated user, call the function, expect it visible.
  - "follows an in-place edit": authenticated `USER`, render; set
    `USER.is_authenticated = false`, call the function, expect the button gone.
  - "ignores a change until it is told": authenticated, render, replace with logged-out
    without calling; expect the button still visible.

- [ ] **Step 2: Run; expect** the logout, login and in-place specs to FAIL (the panel's check
  isn't reactive).

  Run: `npx vitest run --project browser tests/browser/monitor-detail-panel.test.ts`

- [ ] **Step 3: Implement.** Replace `(globalThis as any).USER?.is_authenticated` (and its
  eslint-disable comment) with `isAuthenticated()`, and wrap `<MonitorSubscriptionManager>` in
  `{#key getApiToken()}` so a user switch reloads its status. Logout unmounts the manager, and
  its existing `$effect` cleanup aborts the in-flight status request.

- [ ] **Step 4: Run the browser spec file** → all PASS, including the existing specs.

- [ ] **Step 5: Commit**: `fix: the subscribe control follows a login change`

### Task 3: README

**Files:**
- Modify: `README.md` ("The monitor detail panel"; "Migrating from 4.x")

- [ ] **Step 1:** Under "The monitor detail panel", add a "Who is logged in" paragraph (or
  subsection). It covers:
  - the host sets `globalThis.USER`;
  - the map reads only `is_authenticated` (truthy shows the alerts subscription control) and
    `api_token` (sent with subscription requests when a non-empty string; otherwise none is
    sent and the request relies on the session cookie);
  - the map never writes `USER`;
  - after changing `USER` while the map is showing (replacing it or editing a field), call
    `monitorMapUserChanged()` from `@sjvair/monitor-map` or `/core`, and an open panel
    updates; a host that sets `USER` once before the map loads needs no call;
  - both fields stay stable through 5.0.
- [ ] **Step 2:** Under "Migrating from 4.x", add a bullet. `USER` is read as in 4.x (checked:
  `v4.3.0` reads the same two fields in the same places); `monitorMapUserChanged()` is new;
  call it when the user changes while the map is showing. Add the function to the `/core`
  bullet.
- [ ] **Step 3:** Run `npm run lint` → passes.
- [ ] **Step 4: Commit**: `docs: the USER contract and monitorMapUserChanged`

Then open PR 1 into `release/5.0.0`. Send the coordinator the PR link.

### Task 4: The legend collapses when a panel opens on a narrow screen

Branch `fix/legend-short-map` from `origin/release/5.0.0`.

**Files:**
- Modify: `src/lib/legend/Legend.svelte`
- Modify: `src/lib/MonitorMapLayout.svelte` (pass `{panelOpen}` to `<Legend>`)
- Test: `tests/browser/legend-card.test.ts`

**Interfaces:**
- `Legend` props become `{ map: MapContext; panelOpen?: boolean }` (default `false`).
- Consumes `isWideLayout()` from `$lib/options/layout`.

The rule (state: `collapsed`, `autoCollapsed`; react only to `panelOpen` changing, and to its
initial value):
- Panel opens (including `panelOpen` already `true` on mount) and `!isWideLayout()` and the
  card is expanded: `collapsed = true; autoCollapsed = true`.
- Panel closes: if `autoCollapsed`, set `collapsed = false`. Either way,
  `autoCollapsed = false`.
- A header click clears `autoCollapsed`.
- Track the previous `panelOpen` so a re-run of the effect without a change does nothing.

- [ ] **Step 1: Add failing specs** (use `page.viewport(375, 667)` for narrow and
  `page.viewport(1280, 800)` for wide; use `rerender({ panelOpen })` from `vitest-browser-svelte`):
  - "collapses when a panel opens on a narrow screen, and reopens when it closes"
  - "starts collapsed when mounted with the panel open on a narrow screen" (deep link)
  - "doesn't collapse on a wide screen"
  - "stays collapsed after close if the user collapsed it": open the panel (auto-collapses),
    click to expand, click to collapse, close the panel; expect `aria-expanded="false"`.
  - "stays expanded if the user re-expanded it": open the panel, click to expand, close the
    panel; expect `true`.
  - "doesn't reopen what the user closed before the panel opened": collapse by click, open,
    close; expect `false`.
  - "doesn't collapse again while the panel stays open": open, click to expand, `rerender`
    with `panelOpen: true` again; expect `true`.
- [ ] **Step 2: Run**: `npx vitest run --project browser tests/browser/legend-card.test.ts` →
  the new specs FAIL.
- [ ] **Step 3: Implement** in `Legend.svelte`; pass `{panelOpen}` in `MonitorMapLayout`.
- [ ] **Step 4: Run** the spec file → PASS; `npm run check` → 0 errors.
- [ ] **Step 5: Commit**: `fix: collapse the legend when a monitor panel opens on a phone`

### Task 5: Cap the legend's height

**Files:**
- Modify: `src/lib/MonitorMapLayout.svelte` (`overlays` wrapper)
- Modify: `src/lib/legend/Legend.svelte` (card and body classes)
- Test: `tests/browser/legend-card.test.ts`

Decided values:
- The wrapper spans from below the toolbar to the bottom, pushing the card down:
  `pointer-events-none absolute bottom-4 left-4 top-18 z-10 flex flex-col justify-end`
  (narrow toolbar: `top-4` + `size-10` buttons end at 56px, plus a 16px gap). On `md`, the
  toolbar can wrap to two rows; measure its bottom at 768×1024 and 1280×800 and set the `md:`
  top so the card clears it with a 16px gap (start from `md:top-32`).
- The card: `flex max-h-[min(100%,28rem)] flex-col`. Header `shrink-0`. Body
  `min-h-0 overflow-y-auto`. 28rem is the fixed maximum (≈448px; about half of a 390×844
  phone, and below a landscape tablet's map).

- [ ] **Step 1: Add a failing spec**, "scrolls its scales instead of growing past its
  container": render `Legend` inside a container `div` of fixed height 160px with
  `display:flex; flex-direction:column; justify-content:flex-end` (the same classes as the
  wrapper, set by `style` on a test host), with a fake map returning several sections; expect
  the card's `getBoundingClientRect().height` ≤ 160 and its body's `scrollHeight >
  clientHeight`, and the header button visible.
- [ ] **Step 2: Run** → FAIL (the card is taller than 160px).
- [ ] **Step 3: Implement** the wrapper and card classes above.
- [ ] **Step 4: Run** the spec file → PASS. `npm run check`, `npm run lint`, `npm test` → pass.
- [ ] **Step 5: Phone check with Playwright** against `npm run dev` (port 5174) and the local
  backend, at 360×640, 375×667 and 390×844, URL `/monitor/<an active PM2.5 monitor id from
  /api/2.0/monitors/pm25/current/>`:
  - after load the card is collapsed (`aria-expanded="false"`);
  - after a click on "Legend", the card's top is ≥ the Options button's bottom, its header is
    fully on-screen, and its body scrolls when the scales don't fit;
  - closing the panel reopens it.
  Also at 1280×800 (panel open): no change from today except the cap. Save before/after
  screenshots and send them to the user as images.
- [ ] **Step 6: Commit**: `fix: cap the legend's height so it never covers Options and Search`

Then open PR 2 into `release/5.0.0` and send the coordinator the PR link. After each PR
merges (the user's own yes), tell the coordinator so it updates DEFERRED.md. A `5.0.0-beta.1`
then waits for its own yes.
