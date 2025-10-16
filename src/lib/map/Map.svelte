<script lang="ts">
	import type { Attachment } from "svelte/attachments";
	import "@maptiler/sdk/dist/maptiler-sdk.css";
	import { MapController, type MapConfig } from "./map.svelte.ts";

	const { integrations }: Pick<MapConfig, "integrations"> = $props();

	const mapCtrl = new MapController();

	const initMap: Attachment<HTMLDivElement> = (container: HTMLDivElement) => {
		mapCtrl.init({
			container,
			integrations
		});
	};
</script>

<div {@attach initMap} style="width: 100%; height: 100%;"></div>
