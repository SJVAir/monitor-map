<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { SomeMapIntegration } from "$lib/map/integrations/types";

	export interface MapShellProps {
		/** Map integrations to register, e.g. [monitorsMapIntegration] */
		integrations: Array<SomeMapIntegration>;
		/**
		 * True once the caller's own data managers have finished their initial
		 * load. The shell hides the load screen once the map is idle AND this
		 * is true.
		 */
		ready: boolean;
		/** True when the routed detail panel (`children`) should be visible */
		panelOpen: boolean;
		/**
		 * Path prefixes that are part of this map's own routed panel (e.g.
		 * [`${basePath}/monitor/`]) — internal navigation to these should not
		 * trigger the escape-hatch full-page navigation below.
		 */
		knownRoutes?: Array<string>;
		/** Rendered inside the display-options menu toggle */
		menu?: Snippet;
		/** Freeform absolutely-positioned content over the map (legend, search, etc.) */
		overlays?: Snippet;
		/** The routed detail panel content */
		children?: Snippet;
		/**
		 * Base path to use for the sv-router escape-hatch's "known" root route.
		 * If provided, used directly instead of reading `basePath` from
		 * `useMonitorMapRouter()`. Only relevant when `routerEscapeHatch` is
		 * enabled.
		 */
		basePath?: string;
		/**
		 * Whether to install the sv-router escape-hatch (`pageshow`/`click`
		 * listeners that force a full-page navigation for links outside this
		 * map's own routes). Defaults to `true`, preserving the existing
		 * full-page-map behavior. When `true` and no `basePath` prop is given,
		 * `MapShell` falls back to reading `basePath` from
		 * `useMonitorMapRouter()`. Set to `false` to embed `MapShell` inside a
		 * host app with its own routing — this also skips calling
		 * `useMonitorMapRouter()` entirely, so no `provideMonitorMapRouter(...)`
		 * ancestor is required.
		 */
		routerEscapeHatch?: boolean;
	}
</script>

<script lang="ts">
	import LoadScreen, { disable as disableLoadScreen } from "$lib/LoadScreen.svelte";
	import Map from "$lib/map/Map.svelte";
	import Menu from "$lib/map/Menu.svelte";
	import { mapManager } from "$lib/map/map.svelte";
	import { useMonitorMapRouter } from "$lib/router-context";

	let {
		integrations,
		ready,
		panelOpen,
		knownRoutes = [],
		menu,
		overlays,
		children,
		basePath: providedBasePath,
		routerEscapeHatch = true
	}: MapShellProps = $props();

	const basePath = providedBasePath ?? (routerEscapeHatch ? useMonitorMapRouter().basePath : "");
	const TRANSITION_MS = 300;

	$effect(() => {
		// mapManager.map is only ever assigned once its own initial "load" has
		// already fired (see initializeMap in map.svelte.ts), so by the time this
		// effect sees a non-null map, it's already safe to reveal — waiting for a
		// further "idle" event here is unreliable since one may never fire again.
		if (mapManager.map && ready) {
			disableLoadScreen();
		}
	});

	$effect(() => {
		if (panelOpen) {
			// Container width snapped to open; resize after layout settles
			requestAnimationFrame(() => mapManager.map?.resize());
		} else {
			// Container width snaps back after the transform transition ends
			setTimeout(() => mapManager.map?.resize(), TRANSITION_MS);
		}
	});

	/**
	 * HACK: Fix for escaping sv-router and allowing navigation to other pages,
	 * as well as navigating back
	 */
	if (routerEscapeHatch) {
		const rootPath = basePath || "/";

		window.addEventListener("pageshow", (e) => {
			if (e.persisted) window.location.reload();
		});

		document.addEventListener(
			"click",
			(e) => {
				const anchor = e
					.composedPath()
					.find((el) => el instanceof HTMLAnchorElement) as HTMLAnchorElement;
				if (!anchor) return;
				const { pathname } = new URL(anchor.href);
				const isKnown = pathname === rootPath || knownRoutes.some((r) => pathname.startsWith(r));
				if (!isKnown) {
					e.stopImmediatePropagation();
					window.location.href = anchor.href;
				}
			},
			{ capture: true }
		);
	}
</script>

<div class="relative flex h-full w-full flex-col md:flex-row">
	<LoadScreen />
	<div class="relative flex-1 overflow-hidden">
		<Map {integrations} />
		{@render overlays?.()}
		{#if menu}
			<div class="absolute top-4 left-4 z-10">
				<Menu>{@render menu()}</Menu>
			</div>
		{/if}
	</div>
	<div
		class={[
			"panel-containr w-full shrink-0 overflow-hidden",
			panelOpen ? "h-1/2 md:h-full md:w-1/3" : "md:w-0"
		]}
	>
		<div
			class={[
				"panel-contet h-full duration-300 ease-in-out",
				panelOpen
					? "translate-y-0 md:translate-x-0"
					: "translate-y-full md:translate-x-full md:translate-y-0"
			]}
		>
			{@render children?.()}
		</div>
	</div>
</div>
