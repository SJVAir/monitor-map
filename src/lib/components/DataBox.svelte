<script lang="ts">
	import { darken, readableColor } from "color2k";
	import { NEUTRAL_LEVEL_COLOR } from "$lib/levels";

	interface DataBoxProps {
		color: string;
		header: string;
		subheading?: string;
		value: string;
	}

	const { color: givenColor, header, subheading, value }: DataBoxProps = $props();
	// An empty color (a level without one) would make color2k throw.
	const color = $derived(givenColor || NEUTRAL_LEVEL_COLOR);
	const borderColor = $derived(darken(color, 0.1));
	const textColor = $derived(readableColor(color));
</script>

<div
	class="flex flex-col rounded-sm border-4 p-1 text-center"
	style:background-color={color}
	style:border-color={borderColor}
	style:color={textColor}
>
	<p class="text-base whitespace-nowrap">{header}</p>
	<div class="flex flex-1 flex-col items-center justify-center">
		<p class={["font-bold whitespace-nowrap", subheading ? "text-3xl" : "text-4xl"]}>{value}</p>
		{#if subheading}
			<p class="whitespace-nowrap">{subheading}</p>
		{/if}
	</div>
</div>
