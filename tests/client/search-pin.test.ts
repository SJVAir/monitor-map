import { afterEach, describe, expect, it, vi } from "vitest";
import { flushSync } from "svelte";

const calls: string[] = [];
let count = 0;
vi.mock("@maptiler/sdk", () => ({
	Marker: class {
		id = ++count;
		setLngLat() {
			return this;
		}
		addTo(gl: { name: string }) {
			calls.push(`add ${this.id} to ${gl.name}`);
			return this;
		}
		remove() {
			calls.push(`remove ${this.id}`);
		}
	}
}));

vi.mock("@sjvair/map-sdk", () => ({ maptilerMap: (map: { gl: unknown }) => map.gl }));

const { searchPin } = await import("$lib/search/search-pin.svelte.js");
const { glMap } = await import("./gl-map.svelte.js");
const { inEffectRoot } = await import("./fake-map.svelte.js");

let stop: (() => void) | undefined;

function start(first: object | null) {
	const fake = glMap(first);
	let pin!: ReturnType<typeof searchPin>;
	stop = inEffectRoot(() => {
		pin = searchPin(fake.map);
	});
	flushSync();
	return { fake, pin };
}

afterEach(() => {
	stop?.();
	stop = undefined;
	calls.length = 0;
	count = 0;
});

describe("searchPin", () => {
	it("adds the pin to the map", () => {
		const { pin } = start({ name: "A" });
		expect(calls).toEqual([]);
		pin.place([-119.8, 36.7]);
		flushSync();
		expect(calls).toEqual(["add 1 to A"]);
	});

	it("moves to a replaced GL map", () => {
		const { fake, pin } = start({ name: "A" });
		pin.place([-119.8, 36.7]);
		flushSync();
		fake.replace({ name: "B" });
		flushSync();
		expect(calls).toEqual(["add 1 to A", "remove 1", "add 2 to B"]);
	});

	it("waits for a map when there is none yet", () => {
		const { fake, pin } = start(null);
		pin.place([-119.8, 36.7]);
		flushSync();
		expect(calls).toEqual([]);
		fake.replace({ name: "A" });
		flushSync();
		expect(calls).toEqual(["add 1 to A"]);
	});

	it("does not add a pin to a replaced map once cleared", () => {
		const { fake, pin } = start({ name: "A" });
		pin.place([-119.8, 36.7]);
		flushSync();
		pin.clear();
		flushSync();
		expect(calls).toEqual(["add 1 to A", "remove 1"]);
		fake.replace({ name: "B" });
		flushSync();
		expect(calls).toEqual(["add 1 to A", "remove 1"]);
	});

	it("replaces the pin when a new place is chosen", () => {
		const { pin } = start({ name: "A" });
		pin.place([-119.8, 36.7]);
		flushSync();
		pin.place([-120, 37]);
		flushSync();
		expect(calls).toEqual(["add 1 to A", "remove 1", "add 2 to A"]);
	});

	it("is removed on destroy", () => {
		const { pin } = start({ name: "A" });
		pin.place([-119.8, 36.7]);
		flushSync();
		stop?.();
		stop = undefined;
		expect(calls).toEqual(["add 1 to A", "remove 1"]);
	});
});
