<script lang="ts">
	import "@maptiler/sdk/dist/maptiler-sdk.css";
	import { MapController } from "./map.svelte.ts";
	//import { IntegrationsManager } from "./integrations/integrations-manager.ts";

	//const { integrations }: Pick<MapConfig, "integrations"> = $props();
	//const { integrations } = $props();

	const mapCtrl = new MapController();
</script>

<div {@attach mapCtrl.init} style="width: 100%; height: 100%;"></div>
