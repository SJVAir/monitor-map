import { geocoding, type GeocodingFeature } from "@maptiler/sdk";
import type { MonitorLatestType } from "@sjvair/sdk";
import { monitorsManager } from "$lib/monitors/monitors.svelte";
import AirGradientLogo from "../assets/logos/airgradient-blue.svg";
import AirNowLogo from "../assets/logos/airnow-compact.jpg";
import CarbLogo from "../assets/logos/carb-compact.jpg";
import PurpleairLogo from "../assets/logos/purpleair-compact.png";
import SJVAirLogo from "../assets/logos/sjvair.svg";

export type MonitorResult = {
	type: "monitor";
	monitor: MonitorLatestType<"pm25" | "o3">;
	logo: { url: string; alt: string };
};

export type GeocodeResult = {
	type: "geocode";
	feature: GeocodingFeature;
};

export type SearchResult = MonitorResult | GeocodeResult;

const SJV_CENTER: [number, number] = [-119.8, 36.76];

function getMonitorLogo(monitor: MonitorLatestType<"pm25" | "o3">): { url: string; alt: string } {
	switch (monitor.data_source.name) {
		case "AQview":
			return { url: CarbLogo, alt: "AQview" };
		case "AirNow.gov":
			return { url: AirNowLogo, alt: "AirNow.gov" };
		case "PurpleAir":
			return { url: PurpleairLogo, alt: "PurpleAir" };
		case "Central California Asthma Collaborative":
			return { url: SJVAirLogo, alt: "Central California Asthma Collaborative" };
		case "AirGradient":
			return { url: AirGradientLogo, alt: "AirGradient" };
		default:
			return { url: "", alt: "" };
	}
}

async function getProximity(): Promise<[number, number]> {
	return new Promise((resolve) => {
		if (!navigator.geolocation) {
			resolve(SJV_CENTER);
			return;
		}
		const timeout = setTimeout(() => resolve(SJV_CENTER), 3000);
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				clearTimeout(timeout);
				resolve([pos.coords.longitude, pos.coords.latitude]);
			},
			() => {
				clearTimeout(timeout);
				resolve(SJV_CENTER);
			}
		);
	});
}

export async function monitorSearch(query: string): Promise<SearchResult[]> {
	if (!monitorsManager.latest) return [];
	const normalized = query.toLowerCase();
	const results: MonitorLatestType<"pm25" | "o3">[] = [];

	for (const monitor of monitorsManager.latest.values()) {
		const name = monitor.name.toLowerCase();
		if (name === normalized || name.startsWith(normalized) || name.includes(normalized)) {
			results.push(monitor);
		}
		if (results.length >= 4) break;
	}

	return results.map((monitor) => ({
		type: "monitor" as const,
		monitor,
		logo: getMonitorLogo(monitor)
	}));
}

export async function geocode(query: string): Promise<SearchResult[]> {
	const proximity = await getProximity();
	try {
		const result = await geocoding.forward(query, {
			country: ["us"],
			fuzzyMatch: true,
			limit: 4,
			proximity
		});
		return result.features.map((feature) => ({ type: "geocode" as const, feature }));
	} catch {
		return [];
	}
}
