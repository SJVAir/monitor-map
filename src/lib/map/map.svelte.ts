import { config, Map as MaptilerMap, Popup, MapStyle, type GeoJSONSource, } from "@maptiler/sdk";
import { Singleton, SingleUse } from "@tstk/decorators";
import { LoadingScreen } from "$lib/loading/screen/load-screen.svelte.ts";
import { Reactive } from "$lib/reactivity.svelte.ts";
import { MapGeoJSONIntegration, type MapIntegration } from "./integrations.ts";
import { BaseLayerSeperator } from "./base-layer-seperator.ts";
import { WindMapIntegration } from "./wind.svelte.ts";

export interface MapConfig {
  container: string | HTMLElement;
  integrations?: Array<MapIntegration>;
}

const excludeLayers = [
  "Sport",
  "Tourism",
  "Culture",
  "Shopping",
  "Food"
]

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

    $effect(() => {
      if (this.initialized) {
        console.log("initialized")
        for (const integration of this.integrations) {
          const isVisible = this.map.getLayoutProperty(integration.referenceId, "visibility");

          if (integration.enabled) {
            if (isVisible !== "visible" || !isVisible) {
              this.map.setLayoutProperty(integration.referenceId, "visibility", "visible");
            }
          } else {
            if (isVisible === "visible" || !isVisible) {
              this.map.setLayoutProperty(integration.referenceId, "visibility", "none");
            }
          }

          if (integration instanceof MapGeoJSONIntegration) {
            console.log("Updating source")
            const source = this.map.getSource(integration.referenceId) as GeoJSONSource;

            if (integration.mapSource.type === "geojson") {
              source.setData(integration.mapSource.data);
            }

            if (integration.filters) {
              this.map.setFilter(integration.referenceId, integration.filters);
            }
          }
        }
      }
    });
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

    this.map.on("load", async () => {
      this.map.addLayer(new BaseLayerSeperator().mapLayer);

      for (const integration of this.integrations) {
        if (integration instanceof MapGeoJSONIntegration) {
          await integration.icons.loadIcons(this.map);
          //for (const icon of Object.entries(integration.icons)) {
          //  await this.loadImage(icon, this.map);
          //}
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

  async updateMapStyle(style: keyof typeof MapStyle) {
    this.map.once("style.load", async () => {
      console.log(this.integrations)

      this.map.addLayer(new BaseLayerSeperator().mapLayer);

      for (const integration of this.integrations) {
        if (integration instanceof MapGeoJSONIntegration) {
          for (const icon of Object.entries(integration.icons)) {
            this.map.addImage(...icon);
          }
          this.map.addSource(integration.referenceId, integration.mapSource);
        }

        this.map.addLayer(integration.mapLayer, integration.beforeLayer);

        const isVisible = this.map.getLayoutProperty(integration.referenceId, "visibility");

        if (integration.enabled) {
          if (isVisible !== "visible" || !isVisible) {
            this.map.setLayoutProperty(integration.referenceId, "visibility", "visible");
          }
        } else {
          if (isVisible === "visible" || !isVisible) {
            this.map.setLayoutProperty(integration.referenceId, "visibility", "none");
          }
        }
      }
    });

    this.map.setStyle(MapStyle[style]);
  }

  remove() {
    return this.map?.remove();
  }

  //private async loadImage(mapIcon: [string, MapImageIcon], map: MaptilerMap): Promise<MaptilerMap> {
  //  const [id, { icon, loaded }] = mapIcon;

  //  if (!icon.complete) {
  //    return new Promise((resolve, reject) => {
  //      icon.onload = () => {
  //        resolve(map.addImage(id, icon));
  //      };
  //      icon.onerror = (err) => {
  //        reject(new Error(`Failed to load image ${id}: ${err}`, { cause: err }));
  //      }
  //    });
  //  } else {
  //    return Promise.resolve(map.addImage(id, icon))
  //  }
  //}
}
