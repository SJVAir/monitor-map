import { mount, unmount, untrack } from "svelte";
import { Popup } from "@maptiler/sdk";
import { maptilerMap, type MapContext } from "@sjvair/map-sdk";
import EvPopup from "./EvPopup.svelte";
import type { EvStation } from "./types";

export interface StationPopups {
	/** Opens `station`'s popup at `lngLat`, closing any other; it belongs to plugin `pluginId`. */
	open(pluginId: string, station: EvStation, lngLat: [number, number]): void;
	close(): void;
}

/**
 * The EV station popup, 4.x's (a MapTiler `Popup` with a close button that a map click leaves
 * open). One is open at a time; it closes on a basemap switch, when its plugin leaves the map,
 * and when the GL map is replaced. Call it during component setup: its effects live as long as
 * the component.
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
		open(pluginId, station, lngLat) {
			close();
			const gl = maptilerMap(map);
			if (!gl) return;
			const target = document.createElement("div");
			const instance = mount(EvPopup, { target, props: { station } });
			const popup = new Popup({ closeButton: true, closeOnClick: false, maxWidth: "none" })
				.setLngLat(lngLat)
				.setDOMContent(target);
			popup.on("close", () => {
				unmount(instance);
				if (current?.popup === popup) current = null;
			});
			current = { popup, pluginId };
			popup.addTo(gl);
		},
		close
	};
}
