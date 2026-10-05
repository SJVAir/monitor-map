import type { Map as MaptilerMap } from "@maptiler/sdk";
import type { Feature, Geometry } from "geojson";
import type { MapIconManager } from "./map-icon-manager";
import { MapLayerIntegration } from "./map-layer-integration.svelte";
import { mapManager } from "../map.svelte";

export abstract class MapGeoJSONIntegration<
	T = Record<string, unknown>
> extends MapLayerIntegration {
	abstract features: Array<Feature<Geometry, T>>;
	abstract mapSource: Parameters<MaptilerMap["addSource"]>[1];

	remove() {
		this.removeLayerAndSource();
	}

	/**
	 * Removes only this integration's own layer and source. Non-virtual on purpose: `apply()`
	 * paths call it to clear stale map state before re-adding, without triggering a subclass's
	 * `remove()` override (which also tears down tooltips/click handlers that apply just set up).
	 */
	protected removeLayerAndSource(): void {
		if (mapManager.map?.getLayer(this.referenceId)) {
			mapManager.map.removeLayer(this.referenceId);
		}
		if (mapManager.map?.getSource(this.referenceId)) {
			mapManager.map.removeSource(this.referenceId);
		}
	}
}

export abstract class MapIconLayerIntegration<
	T = Record<string, unknown>
> extends MapGeoJSONIntegration<T> {
	abstract icons: MapIconManager;

	apply() {
		if (!mapManager.map) return;

		this.icons.loadIcons().then(() => {
			this.removeLayerAndSource();
			mapManager.map?.addSource(this.referenceId, this.mapSource);
			super.apply();
		});
	}
}
