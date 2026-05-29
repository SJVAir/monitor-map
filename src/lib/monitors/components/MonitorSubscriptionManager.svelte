<script lang="ts">
	import { Check, ChevronDown } from "@lucide/svelte";
	import { getSubscriptions, subscribe, unsubscribe } from "@sjvair/sdk/account";
	import { monitorsManager } from "$lib";

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

	const alertLevels = $derived.by(() => {
		if (!monitorsManager.meta) return [];
		try {
			return monitorsManager.meta
				.entryType("pm25")
				.asIter.levels!.filter((level) =>
					ALERT_LEVEL_NAMES.includes(level.name as (typeof ALERT_LEVEL_NAMES)[number])
				);
		} catch {
			return [];
		}
	});

	$effect(() => {
		void monitorId;
		open = false;
		subscribedLevel = null;
		loadSubscription();
	});

	async function loadSubscription() {
		const id = monitorId;
		loading = true;
		try {
			const subscriptions = await getSubscriptions("");
			if (id !== monitorId) return;
			const match = subscriptions.find((s) => s.monitor === id);
			subscribedLevel = match?.level ?? null;
		} finally {
			if (id === monitorId) loading = false;
		}
	}

	async function handleLevelClick(levelName: string) {
		if (saving) return;
		saving = true;
		const previous = subscribedLevel;
		try {
			if (levelName === subscribedLevel) {
				await unsubscribe({ monitorId, apiToken: "", level: levelName });
				subscribedLevel = null;
			} else {
				await subscribe({ monitorId, apiToken: "", level: levelName });
				subscribedLevel = levelName;
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

{#if (globalThis as any).USER?.is_authenticated}
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
			<ChevronDown
				size={16}
				class={["transition-transform duration-300", open ? "rotate-180" : ""]}
			/>
		</button>

		{#if open}
			<div class="fixed inset-0 z-10" onclick={() => (open = false)}></div>
			<div class="absolute top-full left-0 z-20 mt-1 w-full overflow-hidden rounded shadow-lg">
				{#each alertLevels as level (level.name)}
					<button
						class="flex w-full cursor-pointer items-center justify-between px-4 py-2 text-sm text-white hover:brightness-90"
						style="background-color: #{level.color}"
						disabled={saving}
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
