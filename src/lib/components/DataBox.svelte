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
