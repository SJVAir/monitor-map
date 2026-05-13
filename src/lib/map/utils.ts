import { mount, unmount } from "svelte";
import type { Component, ComponentProps } from "svelte";
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

export function isGeoJSONSource(source: any): source is GeoJSONSource {
	return source && source.type === "geojson";
}

export function mountPopup<C extends Component<any>>(
	component: C,
	props: ComponentProps<C>,
	lngLat: LngLat
): Popup {
	const container = document.createElement("div");
	const instance = mount(component, { target: container, props });
	const popup = new Popup({ closeButton: false, closeOnClick: false, maxWidth: "none" })
		.setLngLat(lngLat)
		.setDOMContent(container);
	popup.on("close", () => unmount(instance));
	return popup;
}
