import type { Map as MaptilerMap } from "@maptiler/sdk";
import type { Feature, Geometry } from "geojson";
import type { MapIconManager } from "./map-icon-manager";
import { MapLayerIntegration } from "./map-layer-integration.svelte";
import { mapManager } from "../map-manager.svelte.js";

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
	private generation = 0;

	/**
	 * Drops every callback still waiting on icons. `apply()` and `remove()` call it, so a
	 * subclass overriding `apply()` without calling `super.apply()` first must call it itself.
	 */
	protected supersedePending(): void {
		this.generation++;
	}

	/**
	 * Runs `run` once the icons have loaded, unless an `apply()` or `remove()` has happened
	 * since (the state it was scheduled for is gone) or a basemap change is in flight (the
	 * refresh on "style.load" re-applies).
	 */
	protected whenIconsLoad(run: () => void): void {
		const generation = this.generation;
		this.icons
			.loadIcons()
			.then(() => {
				if (generation !== this.generation || mapManager.styleLoading) return;
				run();
			})
			.catch(console.error);
	}

	apply() {
		if (!mapManager.map) return;

		this.supersedePending();
		this.whenIconsLoad(() => {
			this.removeLayerAndSource();
			mapManager.map?.addSource(this.referenceId, this.mapSource);
			super.apply();
		});
	}

	remove() {
		this.supersedePending();
		super.remove();
	}
}
