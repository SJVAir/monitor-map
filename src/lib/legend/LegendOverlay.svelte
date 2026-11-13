<script lang="ts">
	import type { MapContext } from "@sjvair/map-sdk";
	import Legend from "./Legend.svelte";

	let { map, panelOpen = false }: { map: MapContext; panelOpen?: boolean } = $props();
</script>

<!-- For MapView's overlays: from below the options toolbar to the bottom, so the legend never
     covers the bar. No z-index, so map-sdk's toolbar, list and card stack above it. -->
<div
	class="pointer-events-none absolute top-[calc(var(--mapsdk-toolbar-height,0px)+1rem)] bottom-4 left-4 flex flex-col justify-end"
>
	<Legend {map} {panelOpen} />
</div>
