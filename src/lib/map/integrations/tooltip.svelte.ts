import type { MapLayerEventType, Popup } from "@maptiler/sdk";
import { mapManager } from "../map.svelte";
import { XMap } from "@tstk/builtin-extensions";

export type TooltipBuilder = (evt: MapLayerEventType["mousemove"] & object) => Popup | void;

function handleZoom() {
	TooltipManager.activeHandle?.clearTooltip();
}

function setCursorPointer() {
	mapManager.map!.getCanvas().style.cursor = "pointer";
}

function setCursorDefault() {
	mapManager.map!.getCanvas().style.cursor = "";
}

export class TooltipManager {
	static activeHandle: TooltipHandle | null = null;

	private isEnabled: boolean = false;
	private _tooltips: XMap<string, TooltipHandle> = new XMap();

	get tooltips(): MapIterator<TooltipHandle> {
		return this._tooltips.values();
	}

	enable(layerId?: string) {
		if (!mapManager.map || this.isEnabled) return;
		mapManager.map.on("zoom", handleZoom);
		this.forEachHandle(layerId, (h) => h.enable());
		this.isEnabled = true;
	}

	disable(layerId?: string) {
		if (!mapManager.map || !this.isEnabled) return;
		mapManager.map.off("zoom", handleZoom);
		this.forEachHandle(layerId, (h) => h.disable());
		this.isEnabled = false;
	}

	get(layerId: string) {
		return this._tooltips.get(layerId);
	}

	has(layerId: string) {
		return this._tooltips.has(layerId);
	}

	register(layerId: string, builder: TooltipBuilder, priority: number = 0) {
		const tooltipHandle = new TooltipHandle(layerId, builder, priority);
		this._tooltips.set(layerId, tooltipHandle);
		return tooltipHandle;
	}

	with(layerId: string | Array<string>, cb: (tooltip: TooltipHandle) => void) {
		const ids = Array.isArray(layerId) ? layerId : [layerId];
		for (const id of ids) {
			const tooltip = this._tooltips.get(id);
			if (tooltip) cb(tooltip);
		}
	}

	private forEachHandle(layerId: string | undefined, cb: (h: TooltipHandle) => void) {
		if (layerId !== undefined && this._tooltips.has(layerId)) {
			cb(this._tooltips.get(layerId)!);
		} else {
			for (const h of this.tooltips) cb(h);
		}
	}
}

class TooltipHandle {
	layerId: string;
	priority: number;
	tooltip: Popup | null = null;

	private activeFeatureId: string | number | undefined = undefined;
	private isEnabled: boolean = false;

	// Arrow fields maintain a stable reference for map.on/map.off and correct `this` binding.
	clearTooltip = () => {
		if (TooltipManager.activeHandle !== this) return;
		this.tooltip?.remove();
		this.tooltip = null;
		TooltipManager.activeHandle = null;
		this.activeFeatureId = undefined;
	};

	private setTooltip: (evt: MapLayerEventType["mousemove"] & object) => void;

	constructor(layerId: string, builder: TooltipBuilder, priority: number = 0) {
		this.layerId = layerId;
		this.priority = priority;

		this.setTooltip = (evt: MapLayerEventType["mousemove"] & object) => {
			if (!mapManager.map || !evt.features) return;

			const featureId = evt.features[0]?.id;
			const isOwner = TooltipManager.activeHandle === this;
			const sameFeature = featureId === this.activeFeatureId;

			if (isOwner && this.tooltip && sameFeature) {
				this.tooltip.setLngLat(evt.lngLat);
				return;
			}

			const activeHandle = TooltipManager.activeHandle;
			if (activeHandle !== null && activeHandle !== this && activeHandle.priority >= this.priority) return;

			activeHandle?.clearTooltip();
			this.activeFeatureId = undefined;

			const tooltip = builder(evt);

			if (tooltip) {
				this.tooltip = tooltip;
				TooltipManager.activeHandle = this;
				this.activeFeatureId = featureId;
				tooltip.addTo(mapManager.map);
			}
		};
	}

	enable() {
		if (!mapManager.map || this.isEnabled) return;
		mapManager.map.on("mousemove", this.layerId, setCursorPointer);
		mapManager.map.on("mouseleave", this.layerId, setCursorDefault);
		mapManager.map.on("mousemove", this.layerId, this.setTooltip);
		mapManager.map.on("mouseleave", this.layerId, this.clearTooltip);
		this.isEnabled = true;
	}

	disable() {
		if (!mapManager.map || !this.isEnabled) return;
		this.clearTooltip();
		mapManager.map.off("mousemove", this.layerId, setCursorPointer);
		mapManager.map.off("mouseleave", this.layerId, setCursorDefault);
		mapManager.map.off("mousemove", this.layerId, this.setTooltip);
		mapManager.map.off("mouseleave", this.layerId, this.clearTooltip);
		this.isEnabled = false;
	}
}
