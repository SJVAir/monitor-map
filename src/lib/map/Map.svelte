<script lang="ts">
	import "@maptiler/sdk/dist/maptiler-sdk.css";
	import { MapController } from "./map.svelte.ts";
	import { MonitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte.ts";
	import { WindMapIntegration } from "$lib/wind/wind.svelte";
	import { BaseLayerSeperator } from "$lib/map/integrations/base-layer-seperator";
	import { IntegrationsManager } from "$lib/map/integrations/integrations-manager";
	import type { SomeMapIntegration } from "./integrations/types.ts";
	//import { IntegrationsManager } from "./integrations/integrations-manager.ts";

	const { integrations }: { integrations: SomeMapIntegration } = $props();
	//const { integrations } = $props();

	const mapCtrl = new MapController();
	const integrationsManager = new IntegrationsManager();

	integrationsManager.register(
		new BaseLayerSeperator(),
		new WindMapIntegration(),
		new MonitorsMapIntegration()
	);
	$effect(() => {
		if (mapCtrl.map) {
			integrationsManager.refresh();
		}
	});
</script>

<div {@attach mapCtrl.init} style="width: 100%; height: 100%;"></div>
