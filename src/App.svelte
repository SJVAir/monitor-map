<script lang="ts">
	import "./app.css";
	import { onDestroy } from "svelte";
	import { Router } from "sv-router";
	import { route } from "./router";
	import LoadScreen, { disable as disableLoadScreen } from "$lib/LoadScreen.svelte";
	import Map from "$lib/map/Map.svelte";
	import Menu from "$lib/map/Menu.svelte";
	import MonitorsDisplayOptions from "$lib/monitors/MonitorsDisplayOptions.svelte";
	import MapLayersDisplayOptions from "$lib/components/MapLayersDisplayOptions.svelte";
	import MapStyleDisplayOptions from "$lib/map/MapStyleDisplayOptions.svelte";
	import { mapManager } from "$lib/map/map.svelte";
	import { monitorsManager } from "$lib/monitors/monitors.svelte";
	import { monitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte.ts";
	import { windMapIntegration } from "$lib/wind/wind.svelte";
	import { baseLayerSeperator } from "$lib/map/integrations/base-layer-seperator";
	import type { SomeMapIntegration } from "$lib/map/integrations/types";
	import { collocationSitesManager } from "$lib/collocation-sites/collocations.svelte";
	import { collocationSitesMapIntegration } from "$lib/collocation-sites/collocations-map-integration.svelte";

	const TRANSITION_MS = 300;

	const integrations: Array<SomeMapIntegration> = [
		baseLayerSeperator,
		collocationSitesMapIntegration,
		windMapIntegration,
		monitorsMapIntegration
	];

	monitorsManager.init();
	collocationSitesManager.init();

	let panelOpen = $derived(route.pathname.startsWith("/monitor/"));
	let panelContainerEl: HTMLDivElement;
	let rafId: number | null = null;
	let animProgress = 0;

	function easeInOut(t: number): number {
		return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
	}

	function animatePanel(open: boolean) {
		if (rafId !== null) cancelAnimationFrame(rafId);

		const target = open ? 1 : 0;
		const startProgress = animProgress;
		const delta = target - startProgress;
		// Scale duration so interrupted mid-animation reverses feel natural
		const duration = TRANSITION_MS * Math.abs(delta);
		const start = performance.now();

		function frame(now: number) {
			const t = duration > 0 ? Math.min((now - start) / duration, 1) : 1;
			animProgress = startProgress + delta * easeInOut(t);
			panelContainerEl.style.setProperty("--panel-progress", String(animProgress));
			mapManager.map?.resize();
			if (t < 1) {
				rafId = requestAnimationFrame(frame);
			} else {
				animProgress = target;
				rafId = null;
			}
		}

		rafId = requestAnimationFrame(frame);
	}

	$effect(() => {
		if (mapManager.map && monitorsManager.initialized) {
			mapManager.map.once("idle", () => disableLoadScreen());
		}
	});

	$effect(() => {
		animatePanel(panelOpen);
		return () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
		};
	});

	onDestroy(() => {
		monitorsManager.autoUpdate.stop();
	});
</script>

<div class="shell">
	<LoadScreen />
	<div class="relative flex-1 overflow-hidden">
		<Map {integrations} />
		<div class="absolute top-0 left-0 z-10 m-4">
			<Menu>
				<MonitorsDisplayOptions />
				<MapLayersDisplayOptions />
				<MapStyleDisplayOptions />
			</Menu>
		</div>
	</div>
	<div class="panel-container" bind:this={panelContainerEl}>
		<div class="panel-content">
			<Router />
		</div>
	</div>
</div>

<style>
	.shell {
		display: flex;
		position: relative;
		width: 100vw;
		height: 100vh;
	}

	.panel-container {
		--panel-progress: 0;
		flex-shrink: 0;
		overflow: hidden;
		width: calc(var(--panel-progress) * 33.333vw);
	}

	.panel-content {
		width: 33.333vw;
		height: 100%;
		transform: translateX(calc((1 - var(--panel-progress)) * 100%));
	}

	@media (max-width: 768px) {
		.shell {
			flex-direction: column;
		}

		.panel-container {
			width: 100vw;
			height: calc(var(--panel-progress) * 50vh);
		}

		.panel-content {
			width: 100vw;
			height: 50vh;
			transform: translateY(calc((1 - var(--panel-progress)) * 100%));
		}
	}
</style>
