import type { Map as MaptilerMap } from "@maptiler/sdk";
import { XMap } from "@tstk/builtin-extensions";
import { state as mapState } from "../map.svelte.ts";
import type { MapImageIcon } from "./types";

const allIcons = new XMap<string, MapImageIcon>();

export class MapIconManager {
  static allIcons: MapIconManager = new MapIconManager(allIcons);

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
    if (!mapState.map) return;
    await Promise.all(this.icons.values().map((icon) => this.loadImage(icon, mapState.map!)));
  }

  register(id: string, icon: HTMLImageElement) {
    const imageIcon: MapImageIcon = { id, image: icon };
    this.icons.set(id, imageIcon);
    allIcons.set(id, imageIcon);
  }

  protected async loadImage(icon: MapImageIcon, map: MaptilerMap): Promise<void> {
    if (!mapState.map) return;
    if (!icon.image.complete) {
      return new Promise((resolve, reject) => {
        icon.image.onload = () => {
          map.addImage(icon.id, icon.image)
          resolve();
        };
        icon.image.onerror = (err) => {
          reject(new Error(`Failed to load image ${icon.id}: ${err}`, { cause: err }));
        };
      });
    } else {
      map.addImage(icon.id, icon.image)
      return Promise.resolve();
    }
  }
}
