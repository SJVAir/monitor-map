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
