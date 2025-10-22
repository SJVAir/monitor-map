import type { Map as MaptilerMap } from "@maptiler/sdk";
import { XMap } from "@tstk/builtin-extensions";
import type { MapImageIcon } from "./types";

export class MapIconManager {
  protected icons: XMap<string, MapImageIcon> = new XMap();

  get(id: string): MapImageIcon | undefined {
    return this.icons.get(id);
  }

  has(id: string): boolean {
    return this.icons.has(id);
  }

  async loadIcons(map: MaptilerMap) {
    return await Promise.all(this.icons.values().map(icon => this.loadImage(icon, map)));
  }

  register(id: string, icon: HTMLImageElement) {
    this.icons.set(id, { id, image: icon });
  }

  protected async loadImage(icon: MapImageIcon, map: MaptilerMap): Promise<MaptilerMap> {
    if (!icon.image.complete) {
      return new Promise((resolve, reject) => {
        icon.image.onload = () => {
          resolve(map.addImage(icon.id, icon.image));
        };
        icon.image.onerror = (err) => {
          reject(new Error(`Failed to load image ${icon.id}: ${err}`, { cause: err }));
        }
      });
    } else {
      return Promise.resolve(map.addImage(icon.id, icon.image))
    }
  }
}
