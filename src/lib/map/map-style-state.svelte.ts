import type { MapStyleVariant, ReferenceMapStyle } from "@maptiler/sdk";
import { DefaultMapStyle, mapManager } from "./map-manager.svelte.js";
import { integrationsManager } from "./integrations/integrations-manager";
import { variantForStyle } from "./basemap";

/** Basemap + theme selection, shared so the Settings menu and Reset Map Options agree. */
class MapStyleState {
	referenceStyle: ReferenceMapStyle = $state.raw(DefaultMapStyle.getReferenceStyle());
	variant: MapStyleVariant = $state.raw(DefaultMapStyle);
	// The variant last handed to setStyle (loaded or still loading); null once a load has failed
	// with nothing left to fall back to, so that any later selection is tried again.
	private applied: MapStyleVariant | null = DefaultMapStyle;
	// The variant the map last finished loading, which a failed change falls back to.
	private loaded: MapStyleVariant = DefaultMapStyle;
	private stopWaiting: (() => void) | null = null;

	selectReferenceStyle(style: ReferenceMapStyle): void {
		this.referenceStyle = style;
		this.selectVariant(variantForStyle(style, this.variant));
	}

	selectVariant(variant: MapStyleVariant): void {
		this.variant = variant;
		this.apply();
	}

	reset(): void {
		this.referenceStyle = DefaultMapStyle.getReferenceStyle();
		this.selectVariant(DefaultMapStyle);
	}

	private apply(): void {
		if (!mapManager.map || this.variant === this.applied) return;
		this.load(this.variant);
	}

	private load(variant: MapStyleVariant): void {
		const map = mapManager.map;
		if (!map) return;
		// A newer change supersedes one still in flight.
		this.stopWaiting?.();
		this.applied = variant;

		// setStyle wipes every custom source/layer; re-add enabled integrations once it loads.
		const onLoad = () => {
			this.stopWaiting?.();
			this.loaded = variant;
			mapManager.styleLoading = false;
			integrationsManager.refresh();
		};
		// "error" also fires for tiles, sprites and glyphs; only the style document failing means
		// the change failed.
		const onError = (event: { error?: unknown }) => {
			if (!isRequestFor(event.error, variant.getExpandedStyleURL())) return;
			this.stopWaiting?.();
			this.recover(variant);
		};
		this.stopWaiting = () => {
			map.off("style.load", onLoad);
			map.off("error", onError);
			this.stopWaiting = null;
		};
		map.on("style.load", onLoad);
		map.on("error", onError);
		mapManager.styleLoading = true;
		map.setStyle(variant);
	}

	/**
	 * A style that fails to load leaves the map with no style at all, so go back to the last one
	 * that loaded and make the selection say so. When that one fails too (e.g. offline) there is
	 * nothing to draw on: `styleLoading` stays set, since integrations cannot add layers to a
	 * missing style, and the next selection starts a fresh attempt.
	 */
	private recover(failed: MapStyleVariant): void {
		if (failed === this.loaded) {
			this.applied = null;
			return;
		}
		this.variant = this.loaded;
		this.referenceStyle = this.loaded.getReferenceStyle();
		this.load(this.loaded);
	}
}

/** Whether a map "error" event's error is a failed request for `url`, ignoring the query. */
function isRequestFor(error: unknown, url: string): boolean {
	const failed = (error as { url?: unknown } | null | undefined)?.url;
	if (typeof failed !== "string") return false;
	return failed.split("?")[0] === url.split("?")[0];
}

export const mapStyleState = new MapStyleState();
export type { MapStyleState };
