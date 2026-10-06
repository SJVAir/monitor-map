<script lang="ts">
	import type { Snippet } from "svelte";
	import CheckboxRow from "./CheckboxRow.svelte";

	interface Props {
		label: string;
		checked: boolean;
		indeterminate?: boolean;
		icon?: Snippet;
		children: Snippet;
	}

	let { label, checked = $bindable(), indeterminate = false, icon, children }: Props = $props();

	// Children show only while the parent is (partly) on, as in the demo.
	const expanded = $derived(checked || indeterminate);
</script>

<CheckboxRow {label} {icon} {indeterminate} {expanded} bind:checked />
{#if expanded}
	<div class="ml-5 border-l border-gray-200">{@render children()}</div>
{/if}
