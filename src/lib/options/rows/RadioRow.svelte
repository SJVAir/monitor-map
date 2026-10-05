<script lang="ts">
	import type { Snippet } from "svelte";

	interface Props {
		name: string;
		label: string;
		checked: boolean;
		onselect: () => void;
		unit?: string;
		help?: string;
		icon?: Snippet;
	}

	let { name, label, checked, onselect, unit, help, icon }: Props = $props();
</script>

<label
	class="flex cursor-pointer flex-col gap-0.5 px-3 py-1.5 text-sm select-none hover:bg-gray-100"
>
	<span class="flex items-center gap-2 whitespace-nowrap">
		<input type="radio" class="accent-brand size-4 shrink-0" {name} {checked} onchange={onselect} />
		{#if icon}
			<span class="flex size-5 shrink-0 items-center justify-center">{@render icon()}</span>
		{/if}
		<span>
			{label}
			{#if unit}<span class="text-xs text-gray-500">({unit})</span>{/if}
		</span>
	</span>
	{#if help}
		<span class="pl-6 text-xs whitespace-normal text-gray-500">{help}</span>
	{/if}
</label>
