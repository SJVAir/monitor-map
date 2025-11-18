import { config as MaptilerConfig, Map as MaptilerMap, MapStyle } from "@maptiler/sdk";
import { LoadingScreenController } from "$lib/loading/screen/load-screen-controller.svelte.ts";
import type { Attachment } from "svelte/attachments";
import { isGeoJSONSource } from "./utils";
import type { Feature, GeoJsonProperties, Geometry } from "geojson";

MaptilerConfig.apiKey = import.meta.env.VITE_MAPTILER_KEY;

const excludeLayers = ["Sport", "Tourism", "Culture", "Shopping", "Food", "Transport"];

interface MapState {
  map: MaptilerMap | null;
}
export const state: MapState = $state({
  map: null
});

export const initializeMap: Attachment<HTMLDivElement> = (container: string | HTMLElement) => {
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

    map.once("idle", () => {
      new LoadingScreenController().disable();
    });

    state.map = map;
  });

  return () => map.remove();
};

export function setDataSource(sourceId: string, features: Array<Feature<Geometry, GeoJsonProperties>>): void {
  const source = state.map?.getSource(sourceId);

  if (isGeoJSONSource(source)) {
    console.log(`Setting data for source ${sourceId} with ${features.length} features.`);
    source.setData({
      type: "FeatureCollection",
      features
    });
  }
}

export function refreshMap(): void {
  if (state.map) {
    removeExcludedLayers();
  }
}

export function removeExcludedLayers(): void {
  for (const toExclude of excludeLayers) {
    if (state.map?.getLayer(toExclude)) {
      state.map.removeLayer(toExclude);
    }
  }
}

export function removeMap(): void {
  return state.map?.remove();
}
