<script lang="ts">
	import "@maptiler/sdk/dist/maptiler-sdk.css";
	import { initializeMap, state as MapState } from "./map.svelte.ts";
	import { IntegrationsManager } from "$lib/map/integrations/integrations-manager";
	import type { SomeMapIntegration } from "./integrations/types.ts";
	//import { IntegrationsManager } from "./integrations/integrations-manager.ts";

	const { integrations }: { integrations: Array<SomeMapIntegration> } = $props();
	//const { integrations } = $props();

	const integrationsManager = new IntegrationsManager();

	integrationsManager.register(...integrations);
	$effect(() => {
		if (MapState.map) {
			integrationsManager.refresh();
		}
	});
</script>

<div {@attach initializeMap} style="width: 100%; height: 100%;"></div>
