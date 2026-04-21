<script lang="ts">
	import "@maptiler/sdk/dist/maptiler-sdk.css";
	import { initializeMap } from "./map.svelte.ts";
	import { integrationsManager } from "$lib/map/integrations/integrations-manager";
	import type { SomeMapIntegration } from "./integrations/types.ts";

	const { integrations }: { integrations: Array<SomeMapIntegration> } = $props();

	integrationsManager.register(...integrations);
</script>

<div {@attach initializeMap} style="width: 100%; height: 100%;"></div>
