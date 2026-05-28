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

export const hmsManager = new HmsManager();
export type { HmsManager as HMSManager };
