import type { MapGeoJSONFeature, MapMouseEvent } from "@maptiler/sdk";
import { mapManager } from "../map.svelte";

export type ClickHandler = (features: MapGeoJSONFeature[], evt: MapMouseEvent & object) => void;

interface ClickRegistration {
	layerIds: string[];
	handler: ClickHandler;
}

class ClickManager {
	private registrations: ClickRegistration[] = [];
	private isListening = false;

	/** Must be called after `mapManager.map` is initialized (i.e. from within `apply()`). */
	register(layerIds: string[], handler: ClickHandler): void {
		const incomingSet = new Set(layerIds);
		const existing = this.registrations.find((r) => r.layerIds.some((id) => incomingSet.has(id)));
		if (existing) {
			existing.layerIds = layerIds;
			existing.handler = handler;
		} else {
			this.registrations.push({ layerIds, handler });
		}
		this.ensureListener();
	}

	unregister(layerIds: string[]): void {
		const set = new Set(layerIds);
		this.registrations = this.registrations.filter((r) => !r.layerIds.some((id) => set.has(id)));
		if (this.registrations.length === 0) {
			this.removeListener();
		}
	}

	private ensureListener(): void {
		if (this.isListening || !mapManager.map) return;
		mapManager.map.on("click", this.handleClick);
		this.isListening = true;
	}

	private removeListener(): void {
		if (!this.isListening) return;
		mapManager.map?.off("click", this.handleClick);
		this.isListening = false;
	}

	private handleClick = (evt: MapMouseEvent & object): void => {
		if (!mapManager.map) return;
		const allLayerIds = this.registrations.flatMap((r) => r.layerIds);
		const features = mapManager.map.queryRenderedFeatures(evt.point, { layers: allLayerIds });
		if (!features.length) return;

		const winningLayerId = features[0].layer.id;
		const registration = this.registrations.find((r) => r.layerIds.includes(winningLayerId));
		if (!registration) return;

		const ownFeatures = features.filter((f) => registration.layerIds.includes(f.layer.id));
		registration.handler(ownFeatures, evt);
	};
}

export const clickManager = new ClickManager();
export type { ClickManager };
