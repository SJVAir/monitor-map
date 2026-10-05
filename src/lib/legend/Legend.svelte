<script lang="ts">
	import { ChevronDownIcon, InfoIcon } from "@lucide/svelte";
	import LegendBar from "./LegendBar.svelte";
	import type { LegendSection } from "./legend-data";

	let { sections }: { sections: Array<LegendSection> } = $props();

	// Independent of which sections are active, so toggling a layer doesn't reset it.
	let collapsed = $state(false);
</script>

{#if sections.length}
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
		{#if !collapsed}
			<div class="flex flex-col gap-3 border-t border-gray-200 px-4 py-3">
				{#each sections as section (section.id)}
					<div>
						<p class="mb-2 text-center text-sm font-semibold">
							{section.title}
							{#if section.unit}
								<span class="text-xs font-normal text-gray-500">({section.unit})</span>
							{/if}
						</p>
						<LegendBar bar={section.bar} />
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
