import {
	getHMSFire,
	getHMSSmoke,
	type HMSFireGeoJSON,
	type HMSSmokeGeoJSON
} from "@sjvair/sdk/hms";
import clustersDbscan from "@turf/clusters-dbscan";
import { featureCollection, point } from "@turf/helpers";
import { HMS_FIRE_DBSCAN_EPSILON, HMS_FIRE_DBSCAN_MIN_POINTS } from "./hms-fire-icon-manager.ts";

export interface HMSFireGroup {
	id: string;
	coordinates: [number, number];
	avgFrp: number;
	count: number;
}

class HmsManager {
	smoke: Array<HMSSmokeGeoJSON> | undefined = $state();
	fire: Array<HMSFireGeoJSON> | undefined = $state();
	fireGroups: Array<HMSFireGroup> | undefined = $state();

	async loadSmoke() {
		this.smoke = await getHMSSmoke();
	}

	async loadFire() {
		const raw = await getHMSFire();
		const filtered = raw.filter((d) => d.frp !== null);
		this.fire = filtered;
		this.fireGroups = computeFireGroups(filtered);
	}
}

function computeFireGroups(fires: HMSFireGeoJSON[]): HMSFireGroup[] {
	if (!fires.length) return [];

	const fc = featureCollection(
		fires.map((d) =>
			point(d.geometry.coordinates as [number, number], { fireId: d.id, frp: d.frp! })
		)
	);

	const clustered = clustersDbscan(fc, HMS_FIRE_DBSCAN_EPSILON, {
		minPoints: HMS_FIRE_DBSCAN_MIN_POINTS,
		units: "kilometers"
	});

	const groups = new Map<string, { frps: number[]; lngs: number[]; lats: number[] }>();

	for (const feature of clustered.features) {
		const props = feature.properties as {
			dbscan: "core" | "edge" | "noise";
			cluster?: number;
			fireId: string;
			frp: number;
		};
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

export const hmsManager = new HmsManager();
export type { HmsManager as HMSManager };
