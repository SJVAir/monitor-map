<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { MapContext } from "@sjvair/map-sdk";

	export interface MapShellProps {
		/** The map to show, from `createMap()` (the monitor map uses `createLiveMap()`). */
		map: MapContext;
		/**
		 * True once the caller's own data managers have finished their initial
		 * load. The shell hides the load screen once the map is ready AND this
		 * is true.
		 */
		ready: boolean;
		/**
		 * Rendered on the load screen, under the logo, for as long as the load screen is up.
		 * Render it only when the caller's initial load failed (e.g. a message and a retry).
		 */
		loadError?: Snippet;
		/** True when the routed detail panel (`children`) should be visible */
		panelOpen: boolean;
		/**
		 * Path prefixes that are part of this map's own routed panel (e.g.
		 * [`${basePath}/monitor/`]) — internal navigation to these should not
		 * trigger the escape-hatch full-page navigation below.
		 */
		knownRoutes?: Array<string>;
		/** The options toolbar (map-sdk's `OptionsToolbar`), passed to `MapView`'s `toolbar`. */
		toolbar?: Snippet;
		/**
		 * Absolutely-positioned content over the map (the legend), rendered in `MapView`'s
		 * `overlays`, so it can read `--mapsdk-toolbar-height` and goes inert with the map.
		 */
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
	import { untrack } from "svelte";
	import { MapView } from "@sjvair/map-sdk";
	import { useMonitorMapRouter } from "$lib/router-context";

	let {
		map,
		ready,
		loadError,
		panelOpen,
		knownRoutes = [],
		toolbar,
		overlays,
		children,
		basePath: providedBasePath,
		routerEscapeHatch = true
	}: MapShellProps = $props();

	// The toolbar's wide/narrow switch measures this box, not the map's, so opening the panel
	// (which narrows the map) doesn't collapse it. `$state` so `MapView` sees it once bound.
	let shell = $state<HTMLElement>();

	// Read once, at setup: the escape hatch's listeners and their root path are installed below
	// for the shell's lifetime, so later prop changes are deliberately ignored.
	const escapeHatch = untrack(() => routerEscapeHatch);
	const basePath =
		untrack(() => providedBasePath) ?? (escapeHatch ? useMonitorMapRouter().basePath : "");

	$effect(() => {
		// `map.ready` is map-sdk's signal that the style loaded and the map went idle.
		if (map.ready && ready) {
			disableLoadScreen();
		}
	});

	/**
	 * HACK: Fix for escaping sv-router and allowing navigation to other pages,
	 * as well as navigating back
	 */
	if (escapeHatch) {
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

<div bind:this={shell} class="relative flex h-full w-full flex-col md:flex-row">
	<LoadScreen error={loadError} />
	<div class="relative flex-1 overflow-hidden">
		<MapView
			{map}
			layoutRoot={shell}
			label="Air quality monitor map"
			controls="engine"
			featureList={{ reveal: "focus" }}
			selectionBar={false}
			tooltip="pointer"
			class="h-full w-full"
			{toolbar}
			{overlays}
		/>
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
