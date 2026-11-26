import { Marker } from "@maptiler/sdk";
import { maptilerMap, type MapContext } from "@sjvair/map-sdk";

export interface SearchPin {
	place(center: [number, number]): void;
	clear(): void;
}

/**
 * The pin a geocoded place leaves on the map. It follows the map: when the GL map is replaced
 * (a basemap or style rebuild), the pin leaves the old one and is added to the new one. Call it
 * during component init; the pin is removed when the component is destroyed.
 */
export function searchPin(map: MapContext): SearchPin {
	let center = $state.raw<[number, number] | null>(null);

	$effect(() => {
		const gl = maptilerMap(map);
		const at = center;
		if (!gl || !at) return;
		const marker = new Marker().setLngLat(at).addTo(gl);
		return () => {
			marker.remove();
		};
	});

	return {
		place(next) {
			center = next;
		},
		clear() {
			center = null;
		}
	};
}
