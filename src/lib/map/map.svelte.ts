import { config, Map as MaptilerMap, Popup, MapStyle, } from "@maptiler/sdk";
import { Singleton, SingleUse } from "@tstk/decorators";
import { LoadingScreen } from "$lib/loading/screen/load-screen.svelte.ts";
import { Reactive } from "$lib/reactivity.svelte.ts";
import { MapGeoJSONIntegration, type MapIntegration } from "./integrations.svelte";
import { BaseLayerSeperator } from "./base-layer-seperator.ts";
import { WindMapIntegration } from "./wind.svelte.ts";

export interface MapConfig {
  container: string | HTMLElement;
  integrations?: Array<MapIntegration>;
}

@Singleton
export class MapController {
  map!: MaptilerMap;
  tooltipPopup: Popup | null = null;

  integrations: Array<MapIntegration> = [
    new WindMapIntegration()
  ];

  @Reactive()
  accessor initialized: boolean = false;


  constructor() {
    config.apiKey = import.meta.env.VITE_MAPTILER_KEY;
  }

  @SingleUse
  init(config: MapConfig) {
    this.integrations = this.integrations.concat(config.integrations ?? []);

    this.map = new MaptilerMap({
      container: config.container,
      center: [-119.7987626619462, 36.76272050981146],
      zoom: 7,
      style: MapStyle.STREETS,
      projection: "globe",
      space: {
        preset: "milkyway"
      }
    });

    setTimeout(async () => {
      this.map.once("style.load", async () => {

        this.map.addLayer(new BaseLayerSeperator().mapLayer);

        for (const integration of this.integrations) {
          console.log("working with:", integration)
          if (integration instanceof MapGeoJSONIntegration) {
            console.log("source before register:", this.map.getSource(integration.referenceId));
            console.log("geojson integration", integration);
            for (const icon of Object.entries(integration.icons)) {
              console.log("loading icon:", icon)
              await this.loadImage(icon, this.map);
            }
            console.log("images loaded")
            this.map.addSource(integration.referenceId, integration.mapSource);
            console.log("source after register:", this.map.getSource(integration.referenceId));
          }

          console.log("testing")
          console.log("re-adding layer for:", integration)
          this.map.addLayer(integration.mapLayer, integration.beforeLayer);

          if (!integration.enabled) {
            this.map.setLayoutProperty(integration.referenceId, "visibility", "none");
          }
        }
      });

      this.map.setStyle(MapStyle.OPENSTREETMAP);
    }, 1000 * 10)

    this.map.on("load", async () => {
      this.map.addLayer(new BaseLayerSeperator().mapLayer);

      for (const integration of this.integrations) {
        console.log(integration)
        if (integration instanceof MapGeoJSONIntegration) {
          console.log("geojson integration", integration);
          for (const icon of Object.entries(integration.icons)) {
            await this.loadImage(icon, this.map);
          }
          this.map.addSource(integration.referenceId, integration.mapSource);
        }

        this.map.addLayer(integration.mapLayer, integration.beforeLayer);

        if (!integration.enabled) {
          this.map.setLayoutProperty(integration.referenceId, "visibility", "none");
        }

        if (integration instanceof MapGeoJSONIntegration) {
          if (integration.tooltip) {
            const tooltip = integration.tooltip(this);

            this.map.on("mousemove", integration.referenceId, tooltip);
            this.map.on("mouseleave", integration.referenceId, () => {
              if (this.tooltipPopup) this.tooltipPopup.remove();
              this.tooltipPopup = null;
            });
          }
        }
      }

      this.map.on("zoom", () => {
        if (this.tooltipPopup) this.tooltipPopup.remove();
        this.tooltipPopup = null;
      });

      this.initialized = true;
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
