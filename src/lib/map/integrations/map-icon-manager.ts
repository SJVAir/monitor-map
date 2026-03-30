import type { Map as MaptilerMap } from "@maptiler/sdk";
import { XMap } from "@tstk/builtin-extensions";
import { mapManager } from "../map.svelte.ts";
import type { MapImageIcon } from "./types";

export class MapIconManager {
	protected icons: XMap<string, MapImageIcon> = new XMap();

	constructor(iconMap?: XMap<string, MapImageIcon>) {
		if (iconMap) {
			this.icons = iconMap;
		}
	}

	get(id: string): MapImageIcon | undefined {
		return this.icons.get(id);
	}

	has(id: string): boolean {
		return this.icons.has(id);
	}

	async loadIcons(): Promise<void> {
		if (!mapManager.map) return;
		await Promise.all(this.icons.values().map((icon) => this.loadImage(icon, mapManager.map!)));
	}

	register(id: string, icon: HTMLImageElement) {
		const imageIcon: MapImageIcon = { id, image: icon };
		this.icons.set(id, imageIcon);
	}

	protected async loadImage(icon: MapImageIcon, map: MaptilerMap): Promise<void> {
		if (!mapManager.map) return;
		if (!icon.image.complete) {
			return new Promise((resolve, reject) => {
				icon.image.onload = () => {
					map.addImage(icon.id, icon.image);
					resolve();
				};
				icon.image.onerror = (err) => {
					reject(new Error(`Failed to load image ${icon.id}: ${err}`, { cause: err }));
				};
			});
		} else {
			map.addImage(icon.id, icon.image);
			return Promise.resolve();
		}
	}
}
