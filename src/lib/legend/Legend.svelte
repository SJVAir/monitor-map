<script lang="ts">
	import { ChevronDownIcon, InfoIcon } from "@lucide/svelte";
	import { untrack } from "svelte";
	import { Legend, legendSection, type MapContext } from "@sjvair/map-sdk";
	import { isWideLayout } from "$lib/options/layout";

	let { map, panelOpen = false }: { map: MapContext; panelOpen?: boolean } = $props();

	// Independent of which sections are active, so toggling a layer doesn't reset it.
	let collapsed = $state(false);
	// True while the legend is collapsed because a panel opened, until the user touches it.
	let autoCollapsed = false;
	let wasPanelOpen = false;

	// On a narrow screen the panel takes the bottom half of the map, so opening one collapses
	// the legend; closing it reopens the legend only if the user hasn't touched it since.
	$effect(() => {
		const open = panelOpen;
		untrack(() => {
			if (open && !wasPanelOpen && !collapsed && !isWideLayout()) {
				collapsed = true;
				autoCollapsed = true;
			} else if (!open && wasPanelOpen) {
				if (autoCollapsed) collapsed = false;
				autoCollapsed = false;
			}
			wasPanelOpen = open;
		});
	});

	function toggle() {
		collapsed = !collapsed;
		autoCollapsed = false;
	}

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
	<!-- Capped by its container (below the options toolbar) and a fixed maximum; the scales
	     scroll while the header stays in view. -->
	<div
		class="pointer-events-auto flex max-h-[min(100%,28rem)] w-84 max-w-[calc(100vw-2rem)] flex-col rounded-md bg-white shadow"
	>
		<button
			type="button"
			class="flex w-full shrink-0 cursor-pointer items-center gap-2 px-4 py-2 font-semibold"
			aria-expanded={!collapsed}
			onclick={toggle}
		>
			<InfoIcon size={18} class="text-gray-500" />
			<span class="flex-1 text-left">Legend</span>
			<ChevronDownIcon size={18} class="transition-transform {collapsed ? '-rotate-90' : ''}" />
		</button>
		<!-- Kept mounted (hidden) when collapsed so the legend doesn't re-read the theme on expand. -->
		<div
			class="min-h-0 overflow-y-auto border-t border-gray-200 px-4 py-3 {collapsed ? 'hidden' : ''}"
		>
			<Legend {map} order="top-first" framed={false} />
		</div>
	</div>
{/if}
