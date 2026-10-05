import type { MapStyleVariant, ReferenceMapStyle } from "@maptiler/sdk";
import { DefaultMapStyle, mapManager } from "./map.svelte";
import { integrationsManager } from "./integrations/integrations-manager";
import { variantForStyle } from "./basemap";

/** Basemap + theme selection, shared so the Settings menu and Reset Map Options agree. */
class MapStyleState {
	referenceStyle: ReferenceMapStyle = $state.raw(DefaultMapStyle.getReferenceStyle());
	variant: MapStyleVariant = $state.raw(DefaultMapStyle);
	private applied: MapStyleVariant = DefaultMapStyle;

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
		const map = mapManager.map;
		if (!map || this.variant === this.applied) return;
		this.applied = this.variant;
		// setStyle wipes every custom source/layer; re-add enabled integrations once it loads.
		map.once("style.load", () => {
			mapManager.styleLoading = false;
			integrationsManager.refresh();
		});
		mapManager.styleLoading = true;
		map.setStyle(this.variant);
	}
}

export const mapStyleState = new MapStyleState();
export type { MapStyleState };
