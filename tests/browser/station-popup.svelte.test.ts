import { afterEach, expect, it, vi } from "vitest";
import type { MapContext } from "@sjvair/map-sdk";
import type { EvStation } from "$lib/ev-stations/types";

// maplibre's Popup needs a WebGL map: a stand-in records the options each popup is built with.
const built: Record<string, unknown>[] = [];
vi.mock("@maptiler/sdk", () => ({
	Popup: class {
		#el = document.createElement("div");
		constructor(options: Record<string, unknown>) {
			built.push(options);
		}
		setLngLat() {
			return this;
		}
		setDOMContent(node: Node) {
			this.#el.append(node);
			return this;
		}
		once() {
			return this;
		}
		addTo() {
			return this;
		}
		remove() {
			return this;
		}
		getElement() {
			return this.#el;
		}
	}
}));

const container = document.createElement("div");
const gl = {
	getContainer: () => container,
	project: () => ({ x: 100, y: 100 }),
	unproject: () => ({ lng: 0, lat: 0 })
};
vi.mock("@sjvair/map-sdk", () => ({ maptilerMap: () => gl }));

const { stationPopups } = await import("$lib/ev-stations/station-popup.svelte.js");

const map = {
	basemap: { current: "streets" },
	gl,
	plugins: [],
	easeTo: vi.fn()
} as unknown as MapContext;
const station = { station_name: "Station 7" } as unknown as EvStation;

let cleanup: (() => void) | null = null;
afterEach(() => {
	cleanup?.();
	built.length = 0;
});

function popups() {
	let result!: ReturnType<typeof stationPopups>;
	cleanup = $effect.root(() => {
		result = stationPopups(map);
	});
	return result;
}

it("closes a popup a tap opened on a tap elsewhere", () => {
	popups().open("ev-l2", station, [-119.8, 36.7], { touch: true });
	expect(built.at(-1)?.closeOnClick).toBe(true);
});

it("keeps a popup a click opened open on a click elsewhere", () => {
	popups().open("ev-l2", station, [-119.8, 36.7], { touch: false });
	expect(built.at(-1)?.closeOnClick).toBe(false);
});
