import type { MapLayerEventType, Popup } from "@maptiler/sdk";
import { mapManager } from "../map.svelte";
import { XMap } from "@tstk/builtin-extensions";

export type TooltipBuilder = (evt: MapLayerEventType["mousemove"] & object) => Popup | void;

function handleZoom() {
	if (TooltipManager.tooltip) TooltipManager.tooltip.remove();
	TooltipManager.tooltip = null;
}

export class TooltipManager {
	static tooltip: Popup | null = null;

	private isEnabled: boolean = false;
	private _tooltips: XMap<string, TooltipHandle> = new XMap();

	get tooltips(): MapIterator<TooltipHandle> {
		return this._tooltips.values();
	}

	enable(layerId?: string) {
		if (!mapManager.map || this.isEnabled) return;
		mapManager.map.on("zoom", handleZoom);

		if (layerId !== undefined && this._tooltips.has(layerId)) {
			const tooltip = this._tooltips.get(layerId);
			tooltip.enable();
		} else {
			for (const tooltip of this.tooltips) {
				tooltip.enable();
			}
		}
		this.isEnabled = true;
	}

	disable(layerId?: string) {
		if (!mapManager.map || !this.isEnabled) return;
		mapManager.map.off("zoom", handleZoom);
		if (layerId !== undefined && this._tooltips.has(layerId)) {
			const tooltip = this._tooltips.get(layerId);
			tooltip.disable();
		} else {
			for (const tooltip of this.tooltips) {
				tooltip.disable();
			}
		}
		this.isEnabled = false;
	}

	get(layerId: string) {
		return this._tooltips.get(layerId);
	}

	has(layerId: string) {
		return this._tooltips.has(layerId);
	}

	register(layerId: string, builder: TooltipBuilder) {
		const tooltipHandle = new TooltipHandle(layerId, builder);
		this._tooltips.set(layerId, tooltipHandle);

		return tooltipHandle;
	}

	with(layerId: string | Array<string>, cb: (tooltip: TooltipHandle) => void) {
		layerId = Array.isArray(layerId) ? layerId : [layerId];

		for (const id of layerId) {
			const tooltip = this._tooltips.get(id);
			if (tooltip) cb(tooltip);
		}
	}
}

class TooltipHandle {
	layerId: string;

	private clearTooltip: () => void;
	private isEnabled: boolean = false;
	private setTooltip: (evt: MapLayerEventType["mousemove"] & object) => void;

	constructor(layerId: string, builder: TooltipBuilder) {
		this.layerId = layerId;
		this.setTooltip = (evt: MapLayerEventType["mousemove"] & object) => {
			if (!mapManager.map || !evt.features) return;

			TooltipManager.tooltip?.remove();

			const tooltip = builder(evt);

			if (tooltip) {
				TooltipManager.tooltip = tooltip;
				TooltipManager.tooltip.addTo(mapManager.map);
			}
		};

		this.clearTooltip = () => {
			if (TooltipManager.tooltip) {
				TooltipManager.tooltip.remove();
				TooltipManager.tooltip = null;
			}
		};
	}

	enable() {
		if (!mapManager.map || this.isEnabled) return;

		mapManager.map.on("mousemove", this.layerId, this.setCursorPointer);
		mapManager.map.on("mouseleave", this.layerId, this.setCursorDefault);

		mapManager.map.on("mousemove", this.layerId, this.setTooltip);
		mapManager.map.on("mouseleave", this.layerId, this.clearTooltip);

		this.isEnabled = true;
	}

	disable() {
		if (!mapManager.map || !this.isEnabled) return;

		TooltipManager.tooltip?.remove();

		mapManager.map.off("mousemove", this.layerId, this.setCursorPointer);
		mapManager.map.off("mouseleave", this.layerId, this.setCursorDefault);

		mapManager.map.off("mousemove", this.layerId, this.setTooltip);
		mapManager.map.off("mouseleave", this.layerId, this.clearTooltip);

		this.isEnabled = false;
	}

	private setCursorPointer() {
		mapManager.map!.getCanvas().style.cursor = "pointer";
	}

	private setCursorDefault() {
		mapManager.map!.getCanvas().style.cursor = "";
	}
}
