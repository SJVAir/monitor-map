<script lang="ts">
	import { BellCheckIcon, BellOffIcon, ChevronDownIcon } from "@lucide/svelte";
	import { subscribe, unsubscribe } from "@sjvair/sdk/account";
	import LoadError from "$lib/LoadError.svelte";
	import { monitorsManager } from "$lib/monitors/monitors.svelte.js";
	import { getApiToken, loadSubscriptionLevel } from "$lib/monitors/subscriptions";

	interface MonitorSubscriptionManagerProps {
		monitorId: string;
	}

	const ALERT_LEVEL_NAMES = [
		"unhealthy_sensitive",
		"unhealthy",
		"very_unhealthy",
		"hazardous"
	] as const;

	const { monitorId }: MonitorSubscriptionManagerProps = $props();

	let open = $state(false);
	let loading = $state(false);
	let saving = $state(false);
	let subscribedLevel: string | null = $state(null);

	// The alert rows, in this order, from the PM2.5 scale; a key the scale lacks is skipped.
	const alertLevels = $derived.by(() => {
		const levels = monitorsManager.meta?.entryType("pm25").scale?.levels ?? [];
		return ALERT_LEVEL_NAMES.flatMap((key) => levels.find((level) => level.key === key) ?? []);
	});

	let loadError = $state(false);
	let attempt = $state(0);

	$effect(() => {
		const id = monitorId;
		void attempt;
		open = false;
		subscribedLevel = null;
		loadError = false;
		const controller = new AbortController();
		const { signal } = controller;
		loading = true;
		loadSubscriptionLevel(id, { signal })
			.then((level) => {
				if (!signal.aborted) subscribedLevel = level;
			})
			.catch((error) => {
				if (signal.aborted) return;
				console.error("Could not load subscription status", error);
				loadError = true;
			})
			.finally(() => {
				if (!signal.aborted) loading = false;
			});
		return () => controller.abort();
	});

	async function handleLevelClick(level: string | null) {
		if (saving || !level) return;
		saving = true;
		const previous = subscribedLevel;
		const apiToken = getApiToken();
		try {
			if (level === subscribedLevel) {
				await unsubscribe({ monitorId, apiToken, level });
				subscribedLevel = null;
			} else {
				await subscribe({ monitorId, apiToken, level });
				subscribedLevel = level;
			}
		} catch {
			subscribedLevel = previous;
			return;
		} finally {
			saving = false;
		}
		open = false;
	}
</script>

{#if loadError}
	<LoadError message="Couldn't load your alert settings." onretry={() => attempt++} />
{:else}
	<div class="relative select-none">
		<button
			class={[
				"flex w-full cursor-pointer items-center justify-center gap-2 rounded border px-3 py-1.5 text-sm font-semibold text-white",
				subscribedLevel
					? "border-green-700 bg-green-600 hover:bg-green-700"
					: "border-blue-600 bg-blue-500 hover:bg-blue-600"
			]}
			disabled={loading}
			onclick={() => (open = !open)}
		>
			{subscribedLevel ? "Manage Subscription" : "Subscribe to Alerts"}
			<ChevronDownIcon
				size={16}
				class={["transition-transform duration-300", open ? "rotate-180" : ""]}
			/>
		</button>

		{#if open}
			<button aria-label="Close" class="fixed inset-0 z-10" onclick={() => (open = false)}></button>
			<div class="absolute top-full left-0 z-20 mt-1 w-full overflow-hidden rounded shadow-lg">
				{#if subscribedLevel}
					<button
						class="flex w-full cursor-pointer items-center justify-between rounded-t border border-black/30 px-4 py-2 text-sm hover:bg-[#F5F5F3]"
						onclick={() => handleLevelClick(subscribedLevel)}
					>
						Unsubscribe
						<BellOffIcon size={14} />
					</button>
				{/if}
				{#each alertLevels as level (level.key)}
					{@const isSubscribed = level.key === subscribedLevel}
					<button
						class={[
							"flex w-full items-center justify-between px-4 py-2 text-sm text-white last:rounded-b",
							!isSubscribed ? "cursor-pointer first:rounded-t hover:brightness-90" : ""
						]}
						style="background-color: {level.color}"
						disabled={saving}
						onclick={!isSubscribed ? () => handleLevelClick(level.key) : null}
					>
						<span>{level.label}</span>
						{#if isSubscribed}
							<BellCheckIcon size={14} />
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	</div>
{/if}
