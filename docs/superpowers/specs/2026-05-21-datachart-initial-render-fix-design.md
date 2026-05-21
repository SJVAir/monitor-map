# DataChart Initial Render Fix

**Date:** 2026-05-21
**Branch:** feat/monitor-details

## Overview

Fix `DataChart.svelte` not rendering the chart on initial monitor detail load. The chart only appears after a manual browser resize because the `{@attach}` lifecycle is not reactive — it runs once at mount when `manager.chartData` is empty, and nothing re-triggers it when data loads.

A companion bug (canvas rendered at physical pixel dimensions causing horizontal overflow) was already fixed by adding `@import "uplot/dist/uPlot.min.css"` to `src/app.css`.

---

## Root Cause

`{@attach chartAttachment}` runs exactly once when `.chart-canvas` mounts. At that point `manager.chartData` is empty (the fetch hasn't completed), so `rebuild()` returns early. When data arrives, `manager.chartData` is updated reactively — but nothing inside the attachment observes that change. The `ResizeObserver` only fires on element resize, not on data changes.

---

## Fix

Add a bridge variable that exposes the `rebuild` function from inside the attachment to the component's reactive layer, then use a `$effect` to call it whenever `manager.chartData` changes.

**All changes are in `src/lib/data-chart/DataChart.svelte`, script section only.**

### 1. Bridge variable

```ts
let triggerRebuild: (() => void) | undefined;
```

Declared at component scope, alongside the existing `let expanded`, `let calendarOpen`, etc.

### 2. Expose `rebuild` from the attachment

Inside `chartAttachment`, immediately after `const rebuild = () => {...}`:

```ts
triggerRebuild = rebuild;
```

### 3. Clear on cleanup

Inside the attachment's `return () => {...}` cleanup:

```ts
triggerRebuild = undefined;
```

### 4. Reactive effect

After the existing `$effect` blocks:

```ts
$effect(() => {
    manager.chartData;
    triggerRebuild?.();
});
```

Reading `manager.chartData` on its own line (no `.length` guard) creates the reactive subscription regardless of whether the array is empty or populated. The effect fires on initial data load, on Update button submissions, and whenever the monitor prop changes and `loadChartData()` runs again.

---

## Interaction with ResizeObserver

The ResizeObserver path is unchanged. It continues to handle window resizes and expand/collapse transitions via `requestAnimationFrame`-debounced `rebuild()` calls. Both paths call the same `rebuild()` function, which is idempotent: it destroys the existing uPlot instance, clears `el.innerHTML`, and creates a fresh instance at the current element dimensions.

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/data-chart/DataChart.svelte` | Add `triggerRebuild` variable, set/clear in attachment, add `$effect` |
