import { mount, unmount } from "svelte";
import type { Component } from "svelte";
import { MapStyle, Popup } from "@maptiler/sdk";
import type { ReferenceMapStyle, GeoJSONSource, LngLat } from "@maptiler/sdk";

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

export function isGeoJSONSource(source: unknown): source is GeoJSONSource {
	return (
		typeof source === "object" &&
		source !== null &&
		"type" in source &&
		(source as Record<string, unknown>).type === "geojson"
	);
}

export function mountPopup<P extends Record<string, unknown>>(
	component: Component<P>,
	props: P,
	lngLat: LngLat,
	closeButton = false
): Popup {
	const container = document.createElement("div");
	const instance = mount(component, { target: container, props });
	const popup = new Popup({ closeButton, closeOnClick: false, maxWidth: "none" })
		.setLngLat(lngLat)
		.setDOMContent(container);
	popup.on("close", () => unmount(instance));
	return popup;
}

export function mountClickPopup<P extends Record<string, unknown>>(
	component: Component<P>,
	props: P,
	lngLat: LngLat
): Popup {
	return mountPopup(component, props, lngLat, true);
}
