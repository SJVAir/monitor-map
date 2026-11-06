<script lang="ts">
	/** A marker image from its SVG markup (e.g. map-sdk's `circle`). */
	let { svg, class: className = "w-4" }: { svg: string | undefined; class?: string } = $props();

	const src = $derived(svg ? `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` : undefined);
</script>

{#if src}
	<img {src} alt="" class={className} />
{/if}
