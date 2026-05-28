import {
	getHMSFire,
	getHMSSmoke,
	type HMSFireGeoJSON,
	type HMSSmokeGeoJSON
} from "@sjvair/sdk/hms";
import clustersDbscan from "@turf/clusters-dbscan";
import { featureCollection, point } from "@turf/helpers";
import { SvelteMap } from "svelte/reactivity";

const HMS_FIRE_DBSCAN_EPSILON = 2;
const HMS_FIRE_DBSCAN_MIN_POINTS = 1;

export interface HMSFireGroup {
	id: string;
	coordinates: [number, number];
	avgFrp: number;
	count: number;
}

class HmsManager {
	smoke: Array<HMSSmokeGeoJSON> | undefined = $state();
	fire: Array<HMSFireGeoJSON & { frp: number }> | undefined = $state();
	fireGroups: Array<HMSFireGroup> | undefined = $state();

	async init() {
		await Promise.allSettled([this.loadSmoke(), this.loadFire()]);
	}

	async loadSmoke() {
		this.smoke = await getHMSSmoke();
	}

	async loadFire() {
		try {
			const raw = await getHMSFire();
			const filtered = raw.filter((d): d is HMSFireGeoJSON & { frp: number } => d.frp !== null);
			const deduped = deduplicateByCoordinates(filtered);
			this.fire = deduped;
			this.fireGroups = computeFireGroups(deduped);
		} catch (err) {
			console.error("HMS fire load failed:", err);
		}
	}
}

function deduplicateByCoordinates(
	fires: (HMSFireGeoJSON & { frp: number })[]
): (HMSFireGeoJSON & { frp: number })[] {
	const latest = new Map<string, HMSFireGeoJSON & { frp: number }>();
	for (const fire of fires) {
		const [lng, lat] = fire.geometry.coordinates as [number, number];
		const key = `${lng},${lat}`;
		const existing = latest.get(key);
		if (!existing || fire.timestamp > existing.timestamp) {
			latest.set(key, fire);
		}
	}
	return Array.from(latest.values());
}

function computeFireGroups(fires: (HMSFireGeoJSON & { frp: number })[]): HMSFireGroup[] {
	if (!fires.length) return [];

	const fc = featureCollection(
		fires.map((d) =>
			point(d.geometry.coordinates as [number, number], { fireId: d.id, frp: d.frp })
		)
	);

	const clustered = clustersDbscan(fc, HMS_FIRE_DBSCAN_EPSILON, {
		minPoints: HMS_FIRE_DBSCAN_MIN_POINTS,
		units: "kilometers"
	});

	const groups = new SvelteMap<string, { frps: number[]; lngs: number[]; lats: number[] }>();

	for (const feature of clustered.features) {
		const props = feature.properties as {
			dbscan: "core" | "edge" | "noise";
			cluster?: number;
			fireId: string;
			frp: number;
		};
		// With minPoints=1 every point self-qualifies as core, so "noise" never occurs.
		// This branch activates correctly if minPoints is raised above 1 in future.
		const key = props.dbscan === "noise" ? `noise-${props.fireId}` : `cluster-${props.cluster}`;
		const [lng, lat] = feature.geometry.coordinates as [number, number];
		const entry = groups.get(key) ?? { frps: [], lngs: [], lats: [] };
		entry.frps.push(props.frp);
		entry.lngs.push(lng);
		entry.lats.push(lat);
		groups.set(key, entry);
	}

	return Array.from(groups.entries()).map(([key, { frps, lngs, lats }]) => ({
		id: `hms-fire-group-${key}`,
		coordinates: [
			lngs.reduce((s, v) => s + v, 0) / lngs.length,
			lats.reduce((s, v) => s + v, 0) / lats.length
		] as [number, number],
		avgFrp: frps.reduce((s, v) => s + v, 0) / frps.length,
		count: frps.length
	}));
}

//async function fakeFireData(): Promise<Array<HMSFireGeoJSON>> {
//  const response: FetchHMSFireResponse["body"] = {
//    data: [
//      {
//        id: "4Kx7mNpQrQ",
//        date: "2026-04-13",
//        satellite: "GOES-16",
//        timestamp: "2026-04-13T18:30:00Z",
//        frp: 360,
//        ecosystem: 4,
//        method: "AF",
//        geometry: {
//          type: "Point",
//          coordinates: [-118.532, 36.591],
//        },
//      },
//      {
//        id: "4Kx7mNpQrD",
//        date: "2026-04-13",
//        satellite: "GOES-16",
//        timestamp: "2026-04-13T18:30:00Z",
//        frp: 20,
//        ecosystem: 4,
//        method: "AF",
//        geometry: {
//          type: "Point",
//          coordinates: [-118.632, 36.691],
//        },
//      },
//      {
//        id: "4Kx7mNpQrT",
//        date: "2026-04-13",
//        satellite: "GOES-16",
//        timestamp: "2026-04-13T18:30:00Z",
//        frp: 152.7,
//        ecosystem: 4,
//        method: "AF",
//        geometry: {
//          type: "Point",
//          coordinates: [-118.832, 36.491],
//        },
//      },
//      {
//        id: "9vBjLsWqYm",
//        date: "2026-04-13",
//        satellite: "GOES-17",
//        timestamp: "2026-04-13T17:45:00Z",
//        frp: 58.2,
//        ecosystem: 2,
//        method: "AF",
//        geometry: {
//          type: "Point",
//          coordinates: [-119.204, 37.112],
//        },
//      },
//      {
//        id: "2HcFnRkVxZ",
//        date: "2026-04-13",
//        satellite: "GOES-16",
//        timestamp: "2026-04-13T16:00:00Z",
//        frp: null,
//        ecosystem: 7,
//        method: "FDC",
//        geometry: {
//          type: "Point",
//          coordinates: [-120.571, 35.883],
//        },
//      },
//    ],
//    page: 1,
//    count: 3,
//    pages: 1,
//    has_next_page: false,
//    has_previous_page: false,
//  };
//  return Promise.resolve(response.data);
//}

//async function fakeSmokeData(): Promise<Array<HMSSmokeGeoJSON>> {
//	const response: FetchHMSSmokeResponse["body"] = {
//		data: [
//			{
//				id: "sM3kNpQrL1",
//				date: "2026-04-13",
//				satellite: "GOES-16",
//				start: "2026-04-13T12:00:00Z",
//				end: "2026-04-13T18:00:00Z",
//				density: "light",
//				geometry: {
//					type: "MultiPolygon",
//					coordinates: [
//						[
//							[
//								[-122.5, 39.5],
//								[-120.5, 39.5],
//								[-120.5, 41.0],
//								[-122.5, 41.0],
//								[-122.5, 39.5]
//							]
//						]
//					]
//				}
//			},
//			{
//				id: "sM3kNpQrL2",
//				date: "2026-04-13",
//				satellite: "GOES-16",
//				start: "2026-04-13T12:00:00Z",
//				end: "2026-04-13T18:00:00Z",
//				density: "medium",
//				geometry: {
//					type: "MultiPolygon",
//					coordinates: [
//						[
//							[
//								[-121.0, 36.5],
//								[-119.0, 36.5],
//								[-119.0, 38.0],
//								[-121.0, 38.0],
//								[-121.0, 36.5]
//							]
//						]
//					]
//				}
//			},
//			{
//				id: "sM3kNpQrL3",
//				date: "2026-04-13",
//				satellite: "GOES-16",
//				start: "2026-04-13T12:00:00Z",
//				end: "2026-04-13T18:00:00Z",
//				density: "heavy",
//				geometry: {
//					type: "MultiPolygon",
//					coordinates: [
//						[
//							[
//								[-119.0, 33.5],
//								[-116.5, 33.5],
//								[-116.5, 35.0],
//								[-119.0, 35.0],
//								[-119.0, 33.5]
//							]
//						]
//					]
//				}
//			}
//		],
//		page: 1,
//		count: 3,
//		pages: 1,
//		has_next_page: false,
//		has_previous_page: false
//	};
//	return Promise.resolve(response.data);
//}

export const hmsManager = new HmsManager();
export type { HmsManager as HMSManager };
