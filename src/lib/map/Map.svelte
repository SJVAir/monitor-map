<script lang="ts">
	import "@maptiler/sdk/dist/maptiler-sdk.css";
	import { initializeMap } from "./map.svelte";
	import { integrationsManager } from "$lib/map/integrations/integrations-manager";
	import type { SomeMapIntegration } from "./integrations/types";

	const { integrations }: { integrations: Array<SomeMapIntegration> } = $props();

	// svelte-ignore state_referenced_locally (we only need the initial reference)
	integrationsManager.register(...integrations);
</script>

<div {@attach initializeMap} style="width: 100%; height: 100%;"></div>
