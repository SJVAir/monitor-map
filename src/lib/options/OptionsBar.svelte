<script lang="ts">
	import type { Snippet } from "svelte";
	import type { Attachment } from "svelte/attachments";
	import { SlidersHorizontalIcon, XIcon } from "@lucide/svelte";
	import { provideOptionsMenus } from "./options-state.svelte.js";
	import { isWideLayout, WIDE_LAYOUT_QUERY } from "./layout";

	interface Props {
		/** OptionsGroup / OptionsMenu content */
		children?: Snippet;
		/** Rendered last in the toolbar (wide) or beside the menu button (narrow) */
		search?: Snippet;
	}

	let { children, search }: Props = $props();

	const menus = provideOptionsMenus();
	const panelId = "monitor-map-options-panel";
	let panelOpen = $state(false);

	// Toolbar only: clicks outside close any click-opened dropdown; clicks inside never do.
	const closeOnOutsideClick: Attachment<HTMLElement> = (node) => {
		function handler(e: MouseEvent) {
			if (isWideLayout() && !node.contains(e.target as Node)) menus.closeAll();
		}
		document.addEventListener("click", handler);
		return () => document.removeEventListener("click", handler);
	};

	// Open menus mean different things in the toolbar (dropdowns) and the panel (expanded
	// sections), so crossing the breakpoint (e.g. rotating a phone) starts from a closed state.
	$effect(() => {
		const query = window.matchMedia(WIDE_LAYOUT_QUERY);
		function onchange() {
			menus.closeAll();
			panelOpen = false;
		}
		query.addEventListener("change", onchange);
		return () => query.removeEventListener("change", onchange);
	});

	function onkeydown(e: KeyboardEvent) {
		if (e.key !== "Escape") return;
		panelOpen = false;
		if (isWideLayout()) menus.closeAll();
	}
</script>

<svelte:window {onkeydown} />

<!-- Covers the map area so the narrow panel can fill it; passes pointer events through. -->
<div class="pointer-events-none absolute inset-0 z-10">
	<div
		{@attach closeOnOutsideClick}
		class="md:absolute md:top-4 md:right-16 md:left-4 md:flex md:flex-wrap md:items-start md:gap-2"
	>
		<div
			class="pointer-events-auto flex items-start gap-2 max-md:absolute max-md:top-4 max-md:left-4 md:contents"
		>
			<button
				type="button"
				class="flex size-10 shrink-0 items-center justify-center rounded-md bg-white shadow md:hidden"
				aria-label="Open map options"
				aria-expanded={panelOpen}
				aria-controls={panelId}
				onclick={() => (panelOpen = true)}
			>
				<SlidersHorizontalIcon size={22} />
			</button>
			{#if search}
				<div class="md:order-last">{@render search()}</div>
			{/if}
		</div>
		<div
			id={panelId}
			class={[
				"pointer-events-auto md:contents",
				"max-md:absolute max-md:inset-0 max-md:z-20 max-md:flex max-md:flex-col max-md:gap-2 max-md:overflow-y-auto max-md:bg-white max-md:p-4 max-md:transition-[translate,visibility] max-md:duration-200",
				!panelOpen && "max-md:invisible max-md:-translate-x-full"
			]}
		>
			<div class="mb-2 flex items-center justify-between md:hidden">
				<p class="text-lg font-semibold">Map Options</p>
				<button
					type="button"
					class="flex size-9 items-center justify-center rounded-md hover:bg-gray-100"
					aria-label="Close map options"
					onclick={() => (panelOpen = false)}
				>
					<XIcon size={20} />
				</button>
			</div>
			{@render children?.()}
		</div>
	</div>
</div>
