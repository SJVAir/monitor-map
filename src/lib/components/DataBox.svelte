<script lang="ts">
	import { darken } from "color2k";

	interface DataBoxProps {
		color: string;
		header: string;
		subheading?: string;
		value: string;
	}

	const { color, header, subheading, value }: DataBoxProps = $props();
</script>

<div
	class="inline-block rounded-sm border-4 p-1 text-center"
	style:background-color={color}
	style:border-color={darken(color, 0.1)}
>
	<p class="text-base whitespace-nowrap">{header}</p>
	<p class="text-3xl font-bold whitespace-nowrap">{value}</p>
	{#if subheading}
		<p class="whitespace-nowrap">{subheading}</p>
	{/if}
</div>
