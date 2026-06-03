import { CROSSHAIR_ICON_SIZE, withCrosshair } from "$lib/map/icons.ts";
import { MonitorShapeIconManager } from "$lib/monitors/monitors-icon-manager.svelte.ts";

const COLLOCATION_ICON_PREFIX = "collocation";
const CROSSHAIR_COLOR = "#4A5FC6";

export function getCollocationIconId(baseIconId: string): string {
	return `${COLLOCATION_ICON_PREFIX}-${baseIconId}`;
}

export class CollocationIconManager extends MonitorShapeIconManager {
	protected get idPrefix(): string {
		return COLLOCATION_ICON_PREFIX;
	}
	protected get iconSize(): number {
		return CROSSHAIR_ICON_SIZE;
	}
	protected transformSvg(svg: string): string {
		return withCrosshair(svg, CROSSHAIR_COLOR);
	}
}
