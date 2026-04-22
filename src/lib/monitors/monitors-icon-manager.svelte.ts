import type { MonitorData, SJVAirEntryLevel } from "@sjvair/sdk";
import { asDataURI, circle, square, triangle } from "$lib/map/icons.ts";
import { MapIconManager } from "$lib/map/integrations/map-icon-manager.ts";
import { mapManager } from "$lib/map/map.svelte.ts";
import { monitorsManager } from "./monitors.svelte.ts";

const MONITOR_ICONS = { circle, square, triangle };
const MONITOR_ICON_WIDTH = 24;
const MONITOR_ICON_HEIGHT = 24;
const MONITOR_ICON_BORDER_WIDTH = 2;
const MONITOR_ICON_DEFAULT_COLOR = "#969696"; // light gray

export function getIconId<T extends MonitorData>(monitor: T, level: SJVAirEntryLevel): string {
	const id = `${monitor.location}-${monitor.is_active ? level.name : "default"}`;

	switch (monitor.type) {
		case "airgradient":
			return `${id}-circle`;

		case "airnow":
		case "aqview":
		case "bam1022":
			return `${id}-triangle`;

		case "purpleair":
			return `${id}-${monitor.is_sjvair ? "circle" : "square"}`;

		default:
			throw new Error(`Map icon for ${monitor.device} has not been set`);
	}
}

export class MonitorsIconManager extends MapIconManager {
	constructor() {
		super();

		$effect.root(() => {
			$effect(() => {
				if (monitorsManager.levels) {
					const iconLevels = [
						...monitorsManager.levels,
						{ name: "default", color: MONITOR_ICON_DEFAULT_COLOR }
					];

					for (const location of ["inside", "outside"]) {
						for (const [shapeName, shape] of Object.entries(MONITOR_ICONS)) {
							for (const level of iconLevels) {
								const id = `${location}-${level.name}-${shapeName}`;
								const src = asDataURI(
									shape(
										level.color,
										MONITOR_ICON_BORDER_WIDTH,
										location === "inside" ? "#000000" : undefined
									)
								);

								if (this.icons.has(id)) {
									const icon = this.icons.get(id);
									if (icon.image.src !== src) {
										icon.image.src = src;
										if (mapManager.map?.hasImage(id)) {
											this.updateImage(icon, mapManager.map);
										}
									}
									continue;
								} else {
									const icon = new Image();
									icon.src = src;
									icon.width = MONITOR_ICON_WIDTH;
									icon.height = MONITOR_ICON_HEIGHT;

									this.register(id, icon);
								}
							}
						}
					}
				}
			});
		});
	}
}
