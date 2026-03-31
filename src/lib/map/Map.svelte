<script lang="ts">
	import "@maptiler/sdk/dist/maptiler-sdk.css";
	import { initializeMap, mapManager } from "./map.svelte.ts";
	import { integrationsManager } from "$lib/map/integrations/integrations-manager";
	import type { SomeMapIntegration } from "./integrations/types.ts";

	const { integrations }: { integrations: Array<SomeMapIntegration> } = $props();
	//const { integrations } = $props();

	integrationsManager.register(...integrations);
	$effect(() => {
		if (mapManager.map) {
			integrationsManager.refresh();
		}
	});
</script>

<div {@attach initializeMap} style="width: 100%; height: 100%;"></div>
