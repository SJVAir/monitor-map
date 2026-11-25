import { mount, unmount, untrack } from "svelte";
import { Popup } from "@maptiler/sdk";
import { maptilerMap, type MapContext } from "@sjvair/map-sdk";
import EvPopup from "./EvPopup.svelte";
import { popupAnchor, shiftInto, type Edges } from "./popup-placement";
import type { EvStation } from "./types";

/**
 * The popup's class. maplibre appends popups to the map container (MapView's `.mapsdk-gl`), which
 * the legend overlay follows; a z-index paints the popup above the legend (which has none) and
 * below map-sdk's list (2), card (3) and toolbar (4).
 */
export const STATION_POPUP_CLASS = "z-1";

/** The popup's gap from the map's edges and from the toolbar, in px. */
const MARGIN = 12;

/** The part of the map container a popup may cover: inside the margin, below the toolbar. */
function freeArea(container: HTMLElement): Edges {
	const toolbar =
		parseFloat(getComputedStyle(container).getPropertyValue("--mapsdk-toolbar-height")) || 0;
	return {
		top: toolbar + MARGIN,
		right: container.clientWidth - MARGIN,
		bottom: container.clientHeight - MARGIN,
		left: MARGIN
	};
}

export interface StationPopups {
	/**
	 * Opens `station`'s popup at `lngLat`, closing any other; it belongs to plugin `pluginId`. One a
	 * tap opened (`touch`) closes on a tap elsewhere; one a click opened stays open, so it can be
	 * read and used.
	 */
	open(
		pluginId: string,
		station: EvStation,
		lngLat: [number, number],
		gesture: { touch: boolean }
	): void;
	close(): void;
}

/**
 * The EV station popup, 4.x's (a MapTiler `Popup` with its own Close button, which a map click
 * leaves open; on touch, a tap elsewhere closes it). One is open at a time; it closes on a basemap
 * switch, when its plugin leaves the map, and when the GL map is replaced. Call it during component
 * setup: its effects live as long as the component.
 */
export function stationPopups(map: MapContext): StationPopups {
	let current: { popup: Popup; pluginId: string } | null = $state.raw(null);

	function close() {
		const open = current;
		current = null;
		open?.popup.remove();
	}

	// A basemap switch or a new GL map closes it.
	$effect(() => {
		void map.basemap.current;
		void map.gl;
		untrack(close);
	});

	// So does its plugin leaving the map (its level turned off). A Marker Clusters flip removes and
	// re-adds the plugin in one pass, so the popup stays: the station is still there.
	$effect(() => {
		const ids = map.plugins.map((plugin) => plugin.id);
		const open = current;
		if (open && !ids.includes(open.pluginId)) untrack(close);
	});

	$effect(() => () => untrack(close));

	return {
		open(pluginId, station, lngLat, { touch }) {
			close();
			const gl = maptilerMap(map);
			if (!gl) return;
			const container = gl.getContainer();
			const area = freeArea(container);
			// Centred above or below the station (never beside it, which a phone is too narrow for),
			// no wider than the map, then the map pans just enough to show all of it.
			const popup = new Popup({
				closeButton: false,
				closeOnClick: touch,
				// Focus moves below, once the popup is measured: maplibre's focus would scroll the map's
				// container (overflow: hidden) to a Close button out of view.
				focusAfterOpen: false,
				anchor: popupAnchor(gl.project(lngLat).y, area),
				maxWidth: `${area.right - area.left}px`,
				className: STATION_POPUP_CLASS
			});
			const target = document.createElement("div");
			const instance = mount(EvPopup, {
				target,
				props: { station, onclose: () => popup.remove() }
			});
			popup.setLngLat(lngLat).setDOMContent(target);
			// Once: a tap on another station removes this popup, then maplibre's click closes it again.
			popup.once("close", () => {
				unmount(instance);
				if (current?.popup === popup) current = null;
			});
			current = { popup, pluginId };
			popup.addTo(gl);

			const box = popup.getElement().getBoundingClientRect();
			const origin = container.getBoundingClientRect();
			const [dx, dy] = shiftInto(
				{
					top: box.top - origin.top,
					right: box.right - origin.left,
					bottom: box.bottom - origin.top,
					left: box.left - origin.left
				},
				area
			);
			// Sub-pixel rounding is no reason to move the map.
			if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
				const center = gl.unproject([
					container.clientWidth / 2 - dx,
					container.clientHeight / 2 - dy
				]);
				map.easeTo({ center: [center.lng, center.lat] });
			}
			popup.getElement().querySelector("button")?.focus({ preventScroll: true });
		},
		close
	};
}
