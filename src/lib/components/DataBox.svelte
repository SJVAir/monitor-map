<script lang="ts">
	import { darken, readableColor } from "color2k";

	interface DataBoxProps {
		color: string;
		header: string;
		subheading?: string;
		value: string;
	}

	const { color, header, subheading, value }: DataBoxProps = $props();
	const borderColor = $derived(darken(color, 0.1));
	const textColor = $derived(readableColor(color));
</script>

<div
	class="inline-block rounded-sm border-4 p-1 text-center"
	style:background-color={color}
	style:border-color={borderColor}
	style:color={textColor}
>
	<p class="text-base whitespace-nowrap">{header}</p>
	<p class="text-3xl font-bold whitespace-nowrap">{value}</p>
	{#if subheading}
		<p class="whitespace-nowrap">{subheading}</p>
	{/if}
</div>
