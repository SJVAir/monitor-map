import { describe, expect, it } from "vitest";
import {
	choosePanelPollutant,
	publishedPollutants,
	readingPollutants
} from "$lib/monitors/panel-pollutant";

const reading = (value: string) => ({ value, timestamp: "2026-10-12T22:00:00Z" });

const META = {
	monitors: {
		purpleair: { entries: { pm25: { published: true }, pm10: { published: false } } },
		airnow: { entries: { o3: { published: true }, pm25: { published: true } } },
		vozbox: { entries: { o3: { published: true } } },
		// A type that carries pm25 but marks it unpublished.
		hidden: { entries: { pm25: { published: false } } },
		// Metadata without the flag at all: carrying the entry type counts.
		legacy: { entries: { o3: {} } }
	}
};

describe("readingPollutants", () => {
	it("lists the pollutants that have a numeric value, pm25 first", () => {
		expect(readingPollutants({ latest: { o3: reading("31"), pm25: reading("4.9") } })).toEqual([
			"pm25",
			"o3"
		]);
	});

	it("counts a zero reading", () => {
		expect(readingPollutants({ latest: { pm25: reading("0.00") } })).toEqual(["pm25"]);
	});

	it("ignores missing, empty and non-numeric values and other entry types", () => {
		// A real monitor's readings carry other entry types too.
		const latest = { pm25: reading(""), o3: reading("n/a"), temperature: reading("79.6") };
		expect(readingPollutants({ latest })).toEqual([]);
		expect(readingPollutants({ latest: {} })).toEqual([]);
	});
});

describe("publishedPollutants", () => {
	it("lists the published pollutants of a monitor type, pm25 first", () => {
		expect(publishedPollutants("airnow", META)).toEqual(["pm25", "o3"]);
		expect(publishedPollutants("purpleair", META)).toEqual(["pm25"]);
	});

	it("leaves out an entry type marked unpublished", () => {
		expect(publishedPollutants("hidden", META)).toEqual([]);
	});

	it("counts an entry type whose metadata has no published flag", () => {
		expect(publishedPollutants("legacy", META)).toEqual(["o3"]);
	});

	it("returns nothing for an unknown monitor type", () => {
		expect(publishedPollutants("mystery", META)).toEqual([]);
	});
});

describe("choosePanelPollutant", () => {
	const purpleair = { type: "purpleair", is_active: true, latest: { pm25: reading("4.9") } };
	const airnow = {
		type: "airnow",
		is_active: true,
		latest: { pm25: reading("6.2"), o3: reading("31") }
	};

	it("uses the map's pollutant when the monitor has a reading for it", () => {
		expect(choosePanelPollutant("o3", airnow, META)).toEqual({ pollutant: "o3", hasReading: true });
		expect(choosePanelPollutant("pm25", airnow, META)).toEqual({
			pollutant: "pm25",
			hasReading: true
		});
	});

	it("falls back to the pollutant the monitor does have", () => {
		expect(choosePanelPollutant("o3", purpleair, META)).toEqual({
			pollutant: "pm25",
			hasReading: true
		});
	});

	it("uses the first available reading when the map has no pollutant yet", () => {
		expect(choosePanelPollutant(null, airnow, META)).toEqual({
			pollutant: "pm25",
			hasReading: true
		});
	});

	it("keeps the map's pollutant for a monitor with no reading whose type publishes it", () => {
		const inactive = { type: "airnow", is_active: false, latest: {} };
		expect(choosePanelPollutant("o3", inactive, META)).toEqual({
			pollutant: "o3",
			hasReading: false
		});
	});

	it("uses the published pollutant for a monitor with no reading of the map's kind", () => {
		const inactive = { type: "purpleair", is_active: false, latest: {} };
		expect(choosePanelPollutant("o3", inactive, META)).toEqual({
			pollutant: "pm25",
			hasReading: false
		});
	});

	it("has no pollutant when the monitor has no reading and its type publishes neither", () => {
		const inactive = { type: "hidden", is_active: false, latest: {} };
		expect(choosePanelPollutant("pm25", inactive, META)).toEqual({
			pollutant: null,
			hasReading: false
		});
	});

	// The API keeps returning an inactive monitor's last reading, however old it is.
	it("does not treat an inactive monitor's leftover reading as current", () => {
		const stale = { type: "purpleair", is_active: false, latest: { pm25: reading("27.00") } };

		expect(choosePanelPollutant("pm25", stale, META)).toEqual({
			pollutant: "pm25",
			hasReading: false
		});
		expect(choosePanelPollutant("o3", stale, META)).toEqual({
			pollutant: "pm25",
			hasReading: false
		});
	});

	it("charts the pollutant an inactive monitor last reported when its type publishes neither", () => {
		const stale = { type: "hidden", is_active: false, latest: { pm25: reading("3.1") } };

		expect(choosePanelPollutant("o3", stale, META)).toEqual({
			pollutant: "pm25",
			hasReading: false
		});
	});
});
