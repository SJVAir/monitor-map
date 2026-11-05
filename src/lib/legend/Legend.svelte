<script lang="ts">
	import { ChevronDownIcon, InfoIcon } from "@lucide/svelte";
	import { Legend, legendSection, type MapContext } from "@sjvair/map-sdk";

	let { map }: { map: MapContext } = $props();

	// Independent of which sections are active, so toggling a layer doesn't reset it.
	let collapsed = $state(false);

	// What map-sdk's Legend would list: a scale with levels, or a status line for a plugin that is
	// loading or failing. The card is hidden while there is none.
	const hasSections = $derived(
		map.plugins.some((plugin) => {
			const data = plugin.legend?.();
			if (!data) return false;
			if ("status" in data) return data.status.state !== "ready";
			return legendSection(data, map.format) !== null;
		})
	);
</script>

{#if hasSections}
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
		<!-- Kept mounted (hidden) when collapsed so the legend doesn't re-read the theme on expand. -->
		<div class="border-t border-gray-200 {collapsed ? 'hidden' : ''}">
			<Legend {map} order="top-first" />
		</div>
	</div>
{/if}
