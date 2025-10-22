import { config, Map as MaptilerMap, Popup, MapStyle } from "@maptiler/sdk";
import { Singleton } from "@tstk/decorators";
import { LoadingScreenController } from "$lib/loading/screen/load-screen-controller.svelte.ts";
import { Reactive } from "$lib/reactivity.svelte.ts";
import type { Attachment } from "svelte/attachments";

const excludeLayers = [
  "Sport",
  "Tourism",
  "Culture",
  "Shopping",
  "Food",
  "Transport",
]

@Singleton
export class MapController {
  @Reactive()
  accessor map: MaptilerMap | undefined;

  tooltipPopup: Popup | null = null;

  constructor() {
    config.apiKey = import.meta.env.VITE_MAPTILER_KEY;
  }

  init: Attachment<HTMLDivElement> = (container: string | HTMLElement) => {

    const map = new MaptilerMap({
      container: container,
      center: [-119.7987626619462, 36.76272050981146],
      zoom: 7,
      style: MapStyle.STREETS,
      projection: "globe",
      space: {
        preset: "milkyway"
      }
    });

    map.on("load", async () => {

      this.removeExcludedLayers(map);


      map.on("zoom", () => {
        if (this.tooltipPopup) this.tooltipPopup.remove();
        this.tooltipPopup = null;
      });

      map.once('idle', () => {
        new LoadingScreenController().disable();
      });

      this.map = map;
    });
  }

  refresh(): void {
    if (this.map) {
      this.removeExcludedLayers(this.map);
    }
  }

  remove(): void {
    return this.map?.remove();
  }

  private removeExcludedLayers(map: MaptilerMap): void {
    for (const toExclude of excludeLayers) {
      if (map.getLayer(toExclude)) {
        map.removeLayer(toExclude);
      }
    }
  }
}
