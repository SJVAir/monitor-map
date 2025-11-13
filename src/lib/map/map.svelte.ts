import { config, Map as MaptilerMap, Popup, MapStyle } from "@maptiler/sdk";
import { Singleton } from "@tstk/decorators";
import { LoadingScreenController } from "$lib/loading/screen/load-screen-controller.svelte.ts";
import { Reactive } from "$lib/reactivity.svelte.ts";
import type { Attachment } from "svelte/attachments";
import { isGeoJSONSource } from "./utils";
import type { Feature, GeoJsonProperties, Geometry } from "geojson";

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

      map.once('idle', () => {
        new LoadingScreenController().disable();
      });

      this.map = map;
    });
  }

  setDataSource(sourceId: string, features: Array<Feature<Geometry, GeoJsonProperties>>): void {
    if (!this.map) return;

    const source = this.map.getSource(sourceId);

    if (isGeoJSONSource(source)) {
      console.log(`Setting data for source ${sourceId} with ${features.length} features.`);
      source.setData({
        type: "FeatureCollection",
        features
      });
    }
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
