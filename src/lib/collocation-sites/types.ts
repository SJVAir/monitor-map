import type { Feature, Geometry } from "geojson";

export type CollocationSiteMapFeature = Feature<Geometry, CollocationSiteMarkerProperties>;

export interface CollocationSiteMarkerProperties {
	icon: string;
	colocated_id: string;
	reference_id: string;
	name: string;
}
