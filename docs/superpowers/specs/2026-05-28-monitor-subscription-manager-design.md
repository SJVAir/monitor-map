# MonitorSubscriptionManager — Svelte 5 Conversion Design

**Date:** 2026-05-28
**Branch:** feat/monitor-subscriptions

## Overview

Convert `src/lib/monitors/components/MonitorSubscriptionManager.svelte` from Vue 3 to Svelte 5, using Svelte 5 runes, Tailwind CSS, and Lucide icons. The component will be placed as a sibling to `MonitorWidgetModal` inside `MonitorDetailPanel.svelte`.

---

## Architecture

Single self-contained component — no composable or manager singleton. All state and API logic lives in `MonitorSubscriptionManager.svelte`. The component is only rendered when `(window as any).USER?.is_authenticated` is true.

---

## Props

```ts
interface MonitorSubscriptionManagerProps {
  monitorId: string;
}
```

---

## State & Data

**Subscription levels** are derived (not hardcoded) from `monitorsManager.meta`:

```ts
const ALERT_LEVEL_NAMES = ["unhealthy_sensitive", "unhealthy", "very_unhealthy", "hazardous"];

const alertLevels = $derived.by(() => {
  if (!monitorsManager.meta) return [];
  return monitorsManager.meta
    .entryType("pm25")
    .asIter.levels!
    .filter(level => ALERT_LEVEL_NAMES.includes(level.name));
});
```

This preserves ordering from the API response and picks up the correct `label` and `color` per level. The color has no `#` prefix per SDK convention — prepend `#` when used in inline styles.

Always uses `pm25` regardless of `monitorsManager.pollutant`, because alert subscriptions are pm25-only.

**Reactive state:**

| Variable | Type | Purpose |
|---|---|---|
| `open` | `boolean` | Dropdown open/closed |
| `loading` | `boolean` | True while initial `getSubscriptions` fetch is in-flight |
| `subscribedLevel` | `string \| null` | The `level.name` the user is subscribed to for this monitor, or `null` |

---

## API Interaction

Import from `@sjvair/sdk/account`:
```ts
import { getSubscriptions, subscribe, unsubscribe } from "@sjvair/sdk/account";
```

**On load / monitor change** (`$effect` watching `monitorId`):
1. Set `loading = true`, reset `open = false`
2. Call `getSubscriptions("")` — empty string is correct; SDK detects `window.USER` and uses Django session auth
3. Find entry where `s.monitor === monitorId`
4. Set `subscribedLevel` to matched entry's `level`, or `null`
5. Set `loading = false`

**On level row click:**
- If `level.name === subscribedLevel` → `await unsubscribe({ monitorId, apiToken: "", level: level.name })` → `subscribedLevel = null`
- Otherwise → `await subscribe({ monitorId, apiToken: "", level: level.name })` → `subscribedLevel = level.name`
- Close dropdown after the call completes
- No optimistic update — state only changes on API success

---

## UI / Visual Design

### Trigger Button

- Blue (`bg-blue-500`) when unsubscribed, label: "Subscribe to Alerts"
- Green (`bg-green-600`) when subscribed, label: "Manage Subscription"
- Disabled while `loading` is true
- Lucide `<ChevronDown>` icon on the right; rotates 180° when `open` (CSS transition via `<style>` block — single class `rotate-icon` with `transform: rotate(180deg)`)
- Style matches `MonitorWidgetModal`'s button: `rounded border px-3 py-1.5 text-sm font-semibold text-white`

### Dropdown

- Positioned absolutely below the button, same width (achieved via a wrapping `relative` div)
- 4 level rows, each:
  - Inline `background-color: #${level.color}`
  - White text: `level.label`
  - Lucide `<Check>` icon on the right when `level.name === subscribedLevel`
  - Hover: `brightness-90` filter via Tailwind (`hover:brightness-90`)
  - `cursor-pointer`, `px-4 py-2 text-sm text-white`
- First row: `rounded-t`, last row: `rounded-b`

### Click-Outside to Close

Use an invisible fixed backdrop behind the dropdown:
```svelte
{#if open}
  <div class="fixed inset-0 z-10" onclick={() => open = false}></div>
  <div class="absolute z-20 w-full ...">
    <!-- level rows -->
  </div>
{/if}
```

---

## Integration in MonitorDetailPanel

Add as a sibling immediately after `<MonitorWidgetModal>`:

```svelte
<MonitorWidgetModal monitorId={monitor.id} />
<MonitorSubscriptionManager monitorId={monitor.id} />
```

---

## Style Block

Only one custom CSS rule needed (Tailwind cannot express the conditional icon rotation):

```css
.rotate-icon {
  transform: rotate(180deg);
}
```

The `transition-transform duration-300` utilities handle the animation on the icon element itself.

---

## Out of Scope

- Multiple simultaneous subscriptions per monitor (single-select only)
- O3 subscription levels
- Any global subscription state or caching across monitors
