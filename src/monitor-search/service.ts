import { http } from "../modules";
import { getCurrentPosition } from "../modules/location";
import { useMonitorsService } from "../Monitors";
import { Monitor } from "../Monitors";
import { Feature, FeatureCollection, Geometry } from "geojson";
import AirNowLogo from "../assets/airnow-compact.jpg";
import CarbLogo from "../assets/carb-compact.jpg";
import PurpleairLogo from "../assets/purpleair-compact.png";
import SJVAirLogo from "../assets/icon-128.webp";
import { MonitorDataSource } from "@sjvair/sdk";

export interface MapTilerGeoJsonProperties {
  ref: string;
  country_code: string;
  kind: string;
  place_type_name: Array<string>;
}

export interface MapTilerGeometryObj {
  type: Geometry["type"];
  coordinates: [number, number];
}

type MapTilerGeometry = MapTilerGeometryObj & Geometry;

export interface MapTilerContext {
  ref: string;
  country_code: string;
  categories?: Array<string>;
  id: string;
  text: string;
  wikidata?: string;
  kind?: string;
  language?: string;
  text_en: string;
  language_en?: string;
  "osm:tags"?: {
    population?: string;
    wikipedia?: string;
    place?: string;
    sqkm?: string;
  };
}

export interface MapTilerFeature
  extends Feature<MapTilerGeometry, MapTilerGeoJsonProperties> {
  center: [number, number];
  place_name: string;
  place_type: Array<string>;
  relevance: number;
  id: string;
  text: string;
  place_type_name: Array<string>;
  context: Array<MapTilerContext>;
  address: string;
  text_en: string;
  place_name_en: string;
}

export interface MapTilerFeatureCollection extends FeatureCollection {
  features: Array<MapTilerFeature>;
}

export class MonitorSearchResult {
  logo: {
    url: string;
    alt: MonitorDataSource["name"];
  };

  constructor(
    public data: Monitor,
  ) {
    this.logo = getMonitorLogo(data);
  }
}

export class GeocodeSearchResult {
  constructor(
    public data: MapTilerFeature,
  ) { }
}

function getMonitorLogo(
  m: Monitor,
): { url: string; alt: MonitorDataSource["name"] } {
  switch (m.data.data_source.name) {
    case "AQview":
      return { url: CarbLogo, alt: "AQview" };

    case "AirNow.gov":
      return { url: AirNowLogo, alt: "AirNow.gov" };

    case "PurpleAir":
      return { url: PurpleairLogo, alt: "PurpleAir" };

    case "Central California Asthma Collaborative":
      return {
        url: SJVAirLogo,
        alt: "Central California Asthma Collaborative",
      };

    case "AirGradient":
      //TODO: get correct logo
      return { url: PurpleairLogo, alt: "PurpleAir" };
  }
}

export async function geocode(query: string) {
  const { coords: { latitude, longitude } } = await getCurrentPosition();
  return http.get<MapTilerFeatureCollection>(
    `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?`,
    {
      params: {
        country: "us",
        fuzzyMatch: "true",
        key: import.meta.env.VITE_MAPTILER_KEY,
        limit: "4",
        proximity: `${longitude},${latitude}`,
      },
    },
  ).then((res) => {
    if (res.data.features.length) {
      return res.data.features.map((f) => new GeocodeSearchResult(f));
    }
    return [];
  })
    .catch((err: unknown) => {
      console.error("Failed to geocode location:", err);
      return [];
    });
}

export async function monitorSearch(query: string) {
  const { monitors } = await useMonitorsService();
  const results = [];

  // Normalize query and names for case-insensitive search
  const normalizedQuery = query.toLowerCase();

  let key: keyof typeof monitors.value;
  for (key in monitors.value) {
    const monitor: Monitor = monitors.value[key];
    const normalizedName = monitor.data.name.toLowerCase();

    // Exact match
    if (normalizedName === normalizedQuery) {
      results.push(monitor);
      continue; // Move to the next name
    }

    // Starts with match
    if (normalizedName.startsWith(normalizedQuery)) {
      results.push(monitor);
      continue; // Move to the next name
    }

    // Fuzzy match (using a simple implementation)
    if (normalizedName.includes(normalizedQuery)) {
      results.push(monitor);
    }
  }

  return results.map((m: Monitor) => new MonitorSearchResult(m))
    .slice(0, 4);
}
