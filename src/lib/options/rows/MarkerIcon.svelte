<script lang="ts">
	import type { MapImageIcon } from "$lib/map/integrations/types";

	let { icon, class: className = "w-4" }: { icon: MapImageIcon | undefined; class?: string } =
		$props();
</script>

{#if icon}
	<img src={icon.image.src} alt="" class={className} />
{/if}
