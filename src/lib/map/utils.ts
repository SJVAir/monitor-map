import { MapStyle, type ReferenceMapStyle } from "@maptiler/sdk";
import type { GeoJSONSource } from "@maptiler/sdk";

export const MAP_STYLE_OPTIONS: ReferenceMapStyle[] = (() => {
	const latest = new Map<string, { version: number; style: ReferenceMapStyle }>();
	for (const style of Object.values(MapStyle) as ReferenceMapStyle[]) {
		const id = style.getId();
		const match = id.match(/^(.+?)_V(\d+)$/i);
		const baseName = match ? match[1] : id;
		const version = match ? parseInt(match[2], 10) : 0;
		const existing = latest.get(baseName);
		if (!existing || version > existing.version) {
			latest.set(baseName, { version, style });
		}
	}
	return Array.from(latest.values())
		.map((e) => e.style)
		.sort((a, b) => a.getName().localeCompare(b.getName()));
})();

export function isGeoJSONSource(source: any): source is GeoJSONSource {
	return source && source.type === "geojson";
}
