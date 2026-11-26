# The `USER` contract, login changes, and the legend on a short map

Date: 2026-11-09
Target release: 5.0.0 (likely shipped first as `5.0.0-beta.1` on npm `next`)
Base branch: `release/5.0.0` (bfd080c). PRs go into `release/5.0.0`; `main` is not touched.

## Why

Three fixes from the mobile app's 5.0 QA (2026-11-09), before 5.0.0 final. The mobile app runs
on `5.0.0-beta.0`; sjvair.com embeds the standalone widget build. Neither may break.

1. The host tells the map who is logged in through a global `USER` object. sjvair.com's Django
   template sets it, and mobile 5.0 now sets it too. The README doesn't mention it.
2. The panel reads `globalThis.USER?.is_authenticated` once, when it renders. If the user logs
   out in the mobile app while a monitor panel is open, the subscribe control stays visible
   until the panel remounts; a tap then sends no token and silently reverts.
3. On a phone with a monitor panel open, the expanded legend card covers the Options and
   Search buttons. At 360×640 and 375×667 the card is taller than the map (≈339px card vs.
   320–334px map), so its own header and collapse button are pushed off the top. At 390×844 it
   fills nearly the whole map.

## Goals

- The `USER` contract is written down in the README and stays stable through 5.0.0.
- The map follows a login change made while it is showing, when the host tells it.
- On a phone, opening a monitor panel doesn't leave the legend covering the map's controls,
  and the legend never grows over Options and Search at any size.

## Non-goals

- No change to sjvair.com. It sets `USER` once at page load and keeps working unchanged.
- No change to map-sdk. Everything involved (the legend card, its placement, `MapShell`) is
  monitor-map's own; map-sdk's `Legend` only renders the scales inside the card.
- The legend card also runs under the zoom/compass/locate buttons at the top right at 390px
  wide. Out of scope: with the auto-collapse it only happens when someone expands the legend
  on purpose.
- No other fields of `USER` are read.

## Anti-goals

- The map must not write to `globalThis.USER`. The host owns its global.
- The legend must not fight the user: it collapses on its own once per panel opening and
  never re-collapses something the user just expanded, or reopens something the user closed.

## Fix 1: document the `USER` contract

The map reads exactly two fields of `globalThis.USER`, and nothing else tells it who is logged
in:

- `is_authenticated`: when truthy, the monitor panel shows the subscribe control
  (`MonitorDetailPanel.svelte`).
- `api_token`: sent with subscription requests (status, subscribe, unsubscribe) only when it
  is a non-empty string (`getApiToken()` in `src/lib/monitors/subscriptions.ts`). Otherwise no
  token is sent and the request relies on the session cookie, as on sjvair.com.

README:

- Under "The monitor detail panel": a short subsection on who is logged in. Covers the global,
  the two fields and what each does, `monitorMapUserChanged` (fix 2), and that both fields
  stay stable through 5.0.0.
- Under "Migrating from 4.x": one bullet. `USER` is unchanged from 4.x (verify this against
  the `v4.3.0` tag before writing it; if 4.x read it differently, say how), and hosts that
  change the logged-in user while the map is showing call `monitorMapUserChanged()` after
  changing the global.

## Fix 2: `monitorMapUserChanged`

Decided with the user: the host calls an exported function (not an event, and not the map
watching the global). Mobile adds one call wherever it changes `globalThis.USER`: on logout
(it swaps in a generic logged-out user object), and on login or a user switch.

Also decided with the user, after the builder check: the function takes no argument and only
says "the user changed". `globalThis.USER` stays the single source of truth. (An earlier draft
had `setMonitorMapUser(user)` with the map keeping its own copy; that was dropped because a
host that called it once and later changed only the global would leave the map stuck on the
old user until a reload.)

- `monitorMapUserChanged()`, exported from `.` and `./core`. It returns nothing.
- The map keeps no copy of the user. It always reads `globalThis.USER`; the call bumps a
  reactive counter so whatever reads the user re-reads it. A replaced object and a field
  edited in place both work, as long as the call follows.
- A host that never calls it (sjvair.com) behaves exactly as today. A missed call is no worse
  than today: the panel picks up the change when it next mounts.
- `getApiToken()` and the panel's `is_authenticated` check both read through one helper that
  depends on that counter.
- With a panel open, after the call:
  - Logout: the subscribe control disappears at once. Its in-flight status request is
    cancelled through its existing `AbortController` (resolves quietly).
  - Login, or a switch to a different user: the control appears, or reloads its status with
    the new token. (Re-mounting the control when the token changes is fine.)
- `tests/bundle/check-bundle.mjs`'s `./core` allow-list gains `monitorMapUserChanged`. The module
  holding the state must not reach the map engine, so `./core` stays light.
- CLAUDE.md's `./core` export list is updated to match.

## Fix 3: the legend on a short map

Decided with the user:

- **Collapse when a panel opens on a narrow screen.** Below Tailwind `md` (the existing
  `WIDE_LAYOUT_QUERY`, where the panel slides up and takes the bottom half), when a monitor
  panel opens and the legend is expanded, the legend collapses. On wide screens nothing
  changes.
- **Reopen only what the map closed.** When the panel closes, the legend reopens only if it
  was collapsed automatically and the user hasn't touched it since. If the user collapsed it
  themselves, or expanded it again while the panel was open, it stays as they left it.
- **Once per opening.** Moving from one monitor to another while the panel stays open doesn't
  collapse it again.
- **Height cap.** The card never extends above the bottom of the Options/Search row. Its
  "Legend" header stays visible and clickable; the scales scroll inside the card when they
  don't fit. The cap is the smaller of a fixed maximum and the space available. (My call: the
  fixed maximum's value is left to the builder; pick one that leaves the map usable on a
  phone in landscape.)
- Opening a deep link to `/monitor/:id` on a phone counts as the panel opening.
- The narrow/wide test is read when the panel opens, not tracked continuously (matching how
  `isWideLayout()` is used elsewhere).

Where: `Legend.svelte` (card, collapse state, scroll) and `MonitorMapLayout.svelte` (passes
whether the panel is open; the `overlays` wrapper's placement).

## Testing

- Specs for `monitorMapUserChanged`: the panel shows and hides the control live after a
  replaced object and after an in-place edit, nothing changes without the call, a missing
  `USER` counts as logged out, and subscribe uses the current token.
- Existing `tests/monitors/subscriptions.test.ts` and `tests/browser/monitor-detail-panel.test.ts`
  keep passing (they set the global directly).
- Browser specs for the legend's collapse rules (`tests/browser/legend-card.test.ts`).
- `npm run check`, `npm run lint`, `npm test`, `npm run test:bundle`.
- Playwright against the dev server and local backend at 360×640, 375×667 and 390×844 with a
  monitor panel open: legend collapsed; after expanding, header reachable, scales scroll,
  Options and Search uncovered. Before/after screenshots go to the user as images.

## Delivery

Two PRs into `release/5.0.0`, each needing the user's own yes to merge:

1. `fix/user-contract`: this spec and the plan, fix 1 and fix 2.
2. `fix/legend-short-map`: fix 3.

Afterwards a `5.0.0-beta.1` is likely so mobile can re-pin; that release needs its own yes.
The coordinator (`data-dashboard-a2`) is told about the `USER` contract and
`monitorMapUserChanged` so it can pass them to the mobile session, and marks the DEFERRED.md
entries done as each PR merges.
