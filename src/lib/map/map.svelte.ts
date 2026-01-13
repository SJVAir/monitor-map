import { config as MaptilerConfig, Map as MaptilerMap, MapStyle } from "@maptiler/sdk";
import { disable as disableLoadScreen } from "$lib/loading/screen/LoadScreen.svelte";
import type { Attachment } from "svelte/attachments";
import { isGeoJSONSource } from "./utils";
import type { Feature, GeoJsonProperties, Geometry } from "geojson";

MaptilerConfig.apiKey = import.meta.env.VITE_MAPTILER_KEY;

const excludeLayers = ["Sport", "Tourism", "Culture", "Shopping", "Food", "Transport"];

interface MapState {
  map: MaptilerMap | null;
}
export const mapState: MapState = $state({
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
      disableLoadScreen();
    });

    mapState.map = map;
  });

  return () => map.remove();
};

export function setDataSource(sourceId: string, features: Array<Feature<Geometry, GeoJsonProperties>>): void {
  const source = mapState.map?.getSource(sourceId);

  if (isGeoJSONSource(source)) {
    console.log(`Setting data for source ${sourceId} with ${features.length} features.`);
    source.setData({
      type: "FeatureCollection",
      features
    });
  }
}

export function refreshMap(): void {
  if (mapState.map) {
    removeExcludedLayers();
  }
}

export function removeExcludedLayers(): void {
  for (const toExclude of excludeLayers) {
    if (mapState.map?.getLayer(toExclude)) {
      mapState.map.removeLayer(toExclude);
    }
  }
}

export function removeMap(): void {
  return mapState.map?.remove();
}
