<script lang="ts">
	import type { Snippet } from "svelte";
	import CheckboxRow from "./CheckboxRow.svelte";
	import SubmenuRow from "./SubmenuRow.svelte";
	import { groupState, setGroup } from "../group-state";

	interface GroupOption {
		key: string;
		label: string;
		option: { value: boolean };
	}

	interface Props {
		label: string;
		/** Only the rows currently visible; hidden rows are never touched by select-all */
		options: Array<GroupOption>;
		icon?: Snippet;
	}

	let { label, options, icon }: Props = $props();

	const status = $derived(groupState(options.map((child) => child.option.value)));
</script>

{#if status !== "empty"}
	<SubmenuRow
		{label}
		{icon}
		indeterminate={status === "indeterminate"}
		bind:checked={
			() => status === "checked",
			(value) =>
				setGroup(
					options.map((child) => child.option),
					value
				)
		}
	>
		{#each options as child (child.key)}
			<CheckboxRow label={child.label} bind:checked={child.option.value} />
		{/each}
	</SubmenuRow>
{/if}
