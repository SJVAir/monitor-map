<script lang="ts">
	import type { Snippet } from "svelte";
	import type { Attachment } from "svelte/attachments";
	import { ChevronDownIcon } from "@lucide/svelte";

	interface Props {
		label: string;
		checked: boolean;
		icon?: Snippet;
		indeterminate?: boolean;
		disabled?: boolean;
		/** When set, shows a chevron reflecting whether this row's children are expanded */
		expanded?: boolean;
	}

	let {
		label,
		checked = $bindable(),
		icon,
		indeterminate = false,
		disabled = false,
		expanded
	}: Props = $props();

	// indeterminate is a DOM property with no HTML attribute; re-runs when the prop changes.
	const syncIndeterminate: Attachment<HTMLInputElement> = (input) => {
		input.indeterminate = indeterminate;
	};
</script>

<label
	class="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm whitespace-nowrap select-none hover:bg-gray-100 has-disabled:cursor-not-allowed has-disabled:opacity-50"
>
	<input
		type="checkbox"
		class="accent-brand size-4 shrink-0"
		bind:checked
		{disabled}
		{@attach syncIndeterminate}
	/>
	{#if icon}
		<span class="flex size-5 shrink-0 items-center justify-center">{@render icon()}</span>
	{/if}
	<span class="flex-1">{label}</span>
	{#if expanded !== undefined}
		<ChevronDownIcon
			size={16}
			class="ml-3 shrink-0 text-gray-500 transition-transform {expanded ? '' : '-rotate-90'}"
		/>
	{/if}
</label>
