import { describe, expect, it } from "vitest";
import { encodeRef, type DataSource } from "@sjvair/map-sdk/data";
import { evPlugin } from "../../src/lib/ev-stations/ev-plugin.svelte.js";
import type { EvFeatureProperties, EvLevel } from "../../src/lib/ev-stations/ev-store.svelte.js";

function source(level: EvLevel): DataSource<EvFeatureProperties> {
	return {
		status: { state: "ready" },
		scale: null,
		features: {
			type: "FeatureCollection",
			features: [
				{
					type: "Feature",
					properties: {
						refKey: encodeRef({ kind: "feature", id: "7" }),
						name: "Station 7",
						value: null,
						level
					},
					geometry: { type: "Point", coordinates: [-119.8, 36.7] }
				}
			]
		}
	} as DataSource<EvFeatureProperties>;
}

describe("evPlugin", () => {
	it("lists a Level 2 station with its detail", () => {
		const items = evPlugin("lvl2", source("lvl2"), { clustered: true }).features?.() ?? [];
		expect(items).toHaveLength(1);
		expect(items[0].detail).toBe("Level 2 charger");
	});

	it("lists a Level 3 station with its detail", () => {
		const items = evPlugin("lvl3", source("lvl3"), { clustered: false }).features?.() ?? [];
		expect(items[0].detail).toBe("Level 3 charger");
	});
});
