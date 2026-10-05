<script lang="ts">
	import {
		blocksBackground,
		gradientBackground,
		tickPosition,
		type LegendBarData
	} from "./legend-data";

	let { bar }: { bar: LegendBarData } = $props();

	const background = $derived(
		bar.kind === "gradient"
			? gradientBackground(bar.colors)
			: blocksBackground(bar.categories.map((category) => category.color))
	);

	// Labels placed on exact stop positions: gradient ticks, or block breakpoints.
	const positioned = $derived(bar.kind === "gradient" ? bar.ticks : (bar.breakpoints ?? null));
</script>

<div class="h-3 rounded" style:background></div>
{#if positioned}
	<div class="relative mt-1 h-4 text-xs">
		{#each positioned as label, i (i)}
			{@const isFirst = i === 0}
			{@const isLast = i === positioned.length - 1}
			<span
				class={[
					"absolute top-0 whitespace-nowrap",
					isFirst && "left-0",
					isLast && "right-0",
					!isFirst && !isLast && "-translate-x-1/2"
				]}
				style:left={!isFirst && !isLast ? `${tickPosition(i, positioned.length)}%` : undefined}
				>{label}</span
			>
		{/each}
	</div>
{:else if bar.kind === "blocks"}
	<div class="mt-1 flex text-xs">
		{#each bar.categories as category, i (i)}
			<span class="min-w-0 flex-1 text-center break-words">{category.label ?? ""}</span>
		{/each}
	</div>
{/if}
