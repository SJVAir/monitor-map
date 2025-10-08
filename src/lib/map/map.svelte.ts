import { config, Map as MaptilerMap, Popup, MapStyle } from "@maptiler/sdk";
//import { WindLayer } from "@maptiler/weather";
import { Singleton, SingleUse } from "@tstk/decorators";
import { LoadingScreen } from "$lib/loading/screen/load-screen.svelte.ts";
import type { MapIntegration } from "$lib/map/types";
import { MonitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte.ts";
import { Reactive } from "$lib/reactivity.svelte.ts";

@Singleton
export class MapController {
  map!: MaptilerMap;
  tooltipPopup: Popup | null = null;

  integrations: Array<MapIntegration<any>> = [
    new MonitorsMapIntegration()
  ];

  @Reactive()
  accessor initialized: boolean = false;


  constructor() {
    config.apiKey = import.meta.env.VITE_MAPTILER_KEY;
  }

  @SingleUse
  init(container: string | HTMLElement) {
    this.map = new MaptilerMap({
      container,
      center: [-119.7987626619462, 36.76272050981146],
      zoom: 7,
      style: MapStyle.STREETS,
      projection: "globe",
      space: {
        preset: "milkyway"
      }
    });

    this.map.on("load", async () => {

      //const layer = new WindLayer({
      //  opacity: 0.5,
      //}); // id is "MapTiler Wind"
      //this.map!.addLayer(layer);

      for (const integration of this.integrations) {
        for (const icon of Object.entries(integration.icons)) {
          await this.loadImage(icon, this.map!);
        }
        this.map!.addSource(...integration.mapSource);
      }

      this.initialized = true;

      for (const integration of this.integrations) {
        this.map!.addLayer(...integration.mapLayer);

        if (integration.tooltip) {
          const popup = integration.tooltip(this);

          this.map!.on("mousemove", integration.referenceId, popup);
          this.map!.on("mouseleave", integration.referenceId, () => {
            if (this.tooltipPopup) this.tooltipPopup.remove();
            this.tooltipPopup = null;
          });
        }
      }

      this.map!.on("zoom", () => {
        if (this.tooltipPopup) this.tooltipPopup.remove();
        this.tooltipPopup = null;
      });

      new LoadingScreen().disable();
    });

  }

  remove() {
    return this.map?.remove();
  }

  private async loadImage(icon: [string, HTMLImageElement], map: MaptilerMap): Promise<MaptilerMap> {
    const [id, image] = icon;

    return new Promise((resolve, reject) => {
      image.onload = () => {
        resolve(map.addImage(id, image));
      };
      image.onerror = (err) => {
        throw new Error(`Failed to load image ${id}: ${err}`, { cause: err });
      }
    });
  }

}
