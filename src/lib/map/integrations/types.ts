import type { MapLayerEventType, Map as MaptilerMap, Popup } from "@maptiler/sdk";
import type { MapIntegration } from "./map-integration.svelte";
import type { MapGeoJSONIntegration } from "./map-geojson-integration.svelte";

export type TooltipPopup = <T extends TooltipController>(
	mapCtrl: T
) => (evt: MapLayerEventType["mousemove"] & object) => void;
export type SomeMapIntegration = MapIntegration | MapGeoJSONIntegration<Record<string, unknown>>;

interface TooltipController {
	tooltip: Popup | null;
	map?: MaptilerMap;
}

export interface MapImageIcon {
	id: string;
	image: HTMLImageElement;
}
