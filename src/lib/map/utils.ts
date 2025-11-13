import type { GeoJSONSource } from "@maptiler/sdk";

export function isGeoJSONSource(source: any): source is GeoJSONSource {
  return source && source.type === "geojson";
}
