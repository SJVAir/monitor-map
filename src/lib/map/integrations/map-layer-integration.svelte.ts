import type { Map as MaptilerMap } from "@maptiler/sdk";
import { untrack } from "svelte";
import { mapManager } from "../map.svelte.ts";
import { MapIntegration } from "./map-integration.svelte.ts";

export abstract class MapLayerIntegration extends MapIntegration {
	abstract referenceId: string;
	abstract mapLayer: Parameters<MaptilerMap["addLayer"]>[0];
	abstract enabled: boolean;
	beforeLayer?: string;

	constructor() {
		super();
		// Each integration manages its own lifecycle. Tracking both mapManager.map and
		// this.enabled means apply/remove fire automatically on map load and on enabled
		// changes. untrack on the call itself prevents reactive reads inside apply/remove
		// from leaking back into this effect's dependency graph.
		$effect.root(() => {
			$effect(() => {
				if (mapManager.map && this.enabled) {
					untrack(() => this.apply());
				} else if (mapManager.map && !this.enabled) {
					untrack(() => this.remove());
				}
			});
		});
	}

	apply() {
		if (!mapManager.map) return;
		if (!mapManager.map.getLayer(this.referenceId)) {
			mapManager.map.addLayer(this.mapLayer, this.beforeLayer);
		}
		mapManager.map.setLayoutProperty(
			this.referenceId,
			"visibility",
			this.enabled ? "visible" : "none"
		);
	}

	remove() {
		if (mapManager.map?.getLayer(this.referenceId)) {
			mapManager.map.removeLayer(this.referenceId);
		}
	}
}
