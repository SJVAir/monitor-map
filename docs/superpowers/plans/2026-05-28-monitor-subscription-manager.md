# MonitorSubscriptionManager Svelte 5 Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `MonitorSubscriptionManager.svelte` from Vue 3 to Svelte 5 runes, replacing hardcoded levels with pm25 metadata from `monitorsManager.meta`, using Tailwind CSS and Lucide icons.

**Architecture:** Single self-contained Svelte 5 component. All state (`open`, `loading`, `subscribedLevel`) and API calls (`getSubscriptions`, `subscribe`, `unsubscribe` from `@sjvair/sdk/account`) live in one file. Levels are derived from `monitorsManager.meta.entryType("pm25").asIter.levels`, filtered to the 4 alert-worthy levels. The component is only rendered for authenticated users and is placed as a sibling to `MonitorWidgetModal` in `MonitorDetailPanel.svelte`.

**Tech Stack:** Svelte 5 (runes: `$props`, `$state`, `$derived`, `$effect`), TypeScript, Tailwind CSS v4, `@lucide/svelte`, `@sjvair/sdk/account`

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Rewrite | `src/lib/monitors/components/MonitorSubscriptionManager.svelte` | Full component: state, API calls, dropdown UI |
| Modify | `src/MonitorDetailPanel.svelte` | Import and render `MonitorSubscriptionManager` as sibling to `MonitorWidgetModal` |

---

## Task 1: Rewrite MonitorSubscriptionManager.svelte

**Files:**
- Rewrite: `src/lib/monitors/components/MonitorSubscriptionManager.svelte`

> No test framework is configured. Verify behavior manually via `npm run dev` after this task.

- [ ] **Step 1: Replace the file contents**

Replace the entire content of `src/lib/monitors/components/MonitorSubscriptionManager.svelte` with:

```svelte
<script lang="ts">
	import { Check, ChevronDown } from "@lucide/svelte";
	import { getSubscriptions, subscribe, unsubscribe } from "@sjvair/sdk/account";
	import { monitorsManager } from "$lib";

	interface MonitorSubscriptionManagerProps {
		monitorId: string;
	}

	const ALERT_LEVEL_NAMES = ["unhealthy_sensitive", "unhealthy", "very_unhealthy", "hazardous"];

	const { monitorId }: MonitorSubscriptionManagerProps = $props();

	let open = $state(false);
	let loading = $state(false);
	let subscribedLevel: string | null = $state(null);

	const alertLevels = $derived.by(() => {
		if (!monitorsManager.meta) return [];
		return monitorsManager.meta
			.entryType("pm25")
			.asIter.levels!.filter((level) => ALERT_LEVEL_NAMES.includes(level.name));
	});

	const buttonLabel = $derived(subscribedLevel ? "Manage Subscription" : "Subscribe to Alerts");

	$effect(() => {
		monitorId;
		open = false;
		loadSubscription();
	});

	async function loadSubscription() {
		loading = true;
		try {
			const subscriptions = await getSubscriptions("");
			const match = subscriptions.find((s) => s.monitor === monitorId);
			subscribedLevel = match?.level ?? null;
		} finally {
			loading = false;
		}
	}

	async function handleLevelClick(levelName: string) {
		if (levelName === subscribedLevel) {
			await unsubscribe({ monitorId, apiToken: "", level: levelName });
			subscribedLevel = null;
		} else {
			await subscribe({ monitorId, apiToken: "", level: levelName });
			subscribedLevel = levelName;
		}
		open = false;
	}
</script>

{#if (window as any).USER?.is_authenticated}
	<div class="relative select-none">
		<button
			class={[
				"flex w-full cursor-pointer items-center justify-center gap-2 rounded border px-3 py-1.5 text-sm font-semibold text-white",
				subscribedLevel ? "border-green-700 bg-green-600 hover:bg-green-700" : "border-blue-600 bg-blue-500 hover:bg-blue-600"
			]}
			disabled={loading}
			onclick={() => (open = !open)}
		>
			{buttonLabel}
			<ChevronDown
				size={16}
				class={["transition-transform duration-300", open ? "rotate-icon" : ""]}
			/>
		</button>

		{#if open}
			<div class="fixed inset-0 z-10" onclick={() => (open = false)}></div>
			<div class="absolute top-full left-0 z-20 mt-1 w-full overflow-hidden rounded shadow-lg">
				{#each alertLevels as level, i (level.name)}
					<button
						class="flex w-full cursor-pointer items-center justify-between px-4 py-2 text-sm text-white hover:brightness-90"
						style="background-color: #{level.color}"
						onclick={() => handleLevelClick(level.name)}
					>
						<span>{level.label}</span>
						{#if level.name === subscribedLevel}
							<Check size={14} />
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	.rotate-icon {
		transform: rotate(180deg);
	}
</style>
```

- [ ] **Step 2: Run type-check**

```bash
npm run check
```

Expected: no errors related to `MonitorSubscriptionManager.svelte`. Fix any type errors before proceeding.

- [ ] **Step 3: Commit**

```bash
git add src/lib/monitors/components/MonitorSubscriptionManager.svelte
git commit -m "feat: convert MonitorSubscriptionManager from Vue to Svelte 5"
```

---

## Task 2: Wire MonitorSubscriptionManager into MonitorDetailPanel

**Files:**
- Modify: `src/MonitorDetailPanel.svelte`

- [ ] **Step 1: Add the import**

In `src/MonitorDetailPanel.svelte`, add the import after the existing `MonitorWidgetModal` import (line 5):

```svelte
import MonitorSubscriptionManager from "$lib/monitors/components/MonitorSubscriptionManager.svelte";
```

The imports block should now read:

```svelte
import DataBox from "$lib/components/DataBox.svelte";
import MonitorWidgetModal from "$lib/monitors/components/MonitorWidgetModal.svelte";
import MonitorSubscriptionManager from "$lib/monitors/components/MonitorSubscriptionManager.svelte";
import DataChart from "$lib/data-chart/DataChart.svelte";
```

- [ ] **Step 2: Add the component after MonitorWidgetModal**

In `src/MonitorDetailPanel.svelte`, find the `<MonitorWidgetModal monitorId={monitor.id} />` line (currently around line 123) and add `MonitorSubscriptionManager` immediately after it:

```svelte
<MonitorWidgetModal monitorId={monitor.id} />
<MonitorSubscriptionManager monitorId={monitor.id} />
```

- [ ] **Step 3: Run type-check**

```bash
npm run check
```

Expected: no errors. Fix any type errors before proceeding.

- [ ] **Step 4: Verify in the browser**

```bash
npm run dev
```

1. Open a monitor detail panel for any monitor
2. If you are **not** logged in: the subscription button should not appear
3. If you **are** logged in (Django session):
   - The blue "Subscribe to Alerts" button should appear below the widget modal button
   - Clicking it opens a dropdown with 4 colored level rows (Unhealthy for Sensitive Groups, Unhealthy, Very Unhealthy, Hazardous)
   - Clicking a level subscribes to it; button turns green and shows "Manage Subscription"; a checkmark appears on that row
   - Clicking the checkmarked level unsubscribes; button returns to blue
   - Clicking outside the dropdown closes it
   - Navigating to a different monitor resets the dropdown and loads that monitor's subscription state

- [ ] **Step 5: Commit**

```bash
git add src/MonitorDetailPanel.svelte
git commit -m "feat: add MonitorSubscriptionManager to MonitorDetailPanel"
```
