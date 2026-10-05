<script lang="ts">
	import type { Snippet } from "svelte";
	import { ChevronDownIcon } from "@lucide/svelte";
	import { useOptionsMenus } from "./options-state.svelte.js";
	import { isWideLayout } from "./layout";

	interface Props {
		id: string;
		label: string;
		icon: Snippet;
		children: Snippet;
		disabled?: boolean;
		/** Anchor the toolbar dropdown to the trigger's right edge */
		alignRight?: boolean;
		/** Show only the icon on the toolbar; the panel section still shows the label */
		iconOnly?: boolean;
	}

	let {
		id,
		label,
		icon,
		children,
		disabled = false,
		alignRight = false,
		iconOnly = false
	}: Props = $props();

	const menus = useOptionsMenus();
	const contentId = $derived(`monitor-map-options-${id}`);
	const open = $derived(menus.isOpen(id) && !disabled);
</script>

<div
	role="presentation"
	class="group/menu relative md:first:[&>button]:rounded-l-md md:last:[&>button]:rounded-r-md"
	onmouseenter={() => {
		if (isWideLayout()) menus.closeOthers(id);
	}}
>
	<button
		type="button"
		{disabled}
		aria-expanded={open}
		aria-controls={contentId}
		aria-label={iconOnly ? label : undefined}
		class="flex h-10 w-full items-center gap-2 px-3 text-sm font-medium whitespace-nowrap select-none disabled:cursor-not-allowed max-md:rounded-md max-md:border max-md:border-gray-200 max-md:bg-white md:w-auto md:hover:bg-gray-100 md:disabled:hover:bg-transparent"
		onclick={() => menus.toggle(id)}
	>
		<span class={["flex size-5 items-center justify-center", disabled && "opacity-50"]}>
			{@render icon()}
		</span>
		<span class={[disabled && "opacity-50", iconOnly && "md:hidden"]}>{label}</span>
		<span class={["ml-auto", disabled && "opacity-50", iconOnly && "md:hidden"]}>
			<ChevronDownIcon size={16} />
		</span>
	</button>
	<div
		id={contentId}
		class={[
			"max-md:pt-1 md:absolute md:top-full md:z-20 md:min-w-64 md:pt-1",
			alignRight ? "md:right-0" : "md:left-0",
			open ? "block" : "hidden",
			!disabled && "md:group-hover/menu:block"
		]}
	>
		<div class="py-1 md:max-h-[69vh] md:overflow-y-auto md:rounded-md md:bg-white md:shadow-lg">
			{@render children()}
		</div>
	</div>
</div>
