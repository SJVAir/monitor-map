import { describe, expect, it, vi } from "vitest";
import type { MonitorData } from "@sjvair/sdk";

vi.mock("@maptiler/sdk", () => ({ geocoding: { forward: vi.fn() } }));
vi.mock("$lib/config.svelte.js", () => ({ monitorMapConfig: () => ({ maptilerKey: "k" }) }));
vi.mock("$lib/stores.svelte.js", () => ({ monitorsStore: {} }));

const { searchMonitors, geocodeQuery } = await import("$lib/search/service");
const { geocoding } = await import("@maptiler/sdk");

const monitor = (id: string, name: string) => ({ id, name }) as unknown as MonitorData;
const withValue = (...ids: string[]) =>
	new Map(ids.map((id) => [id, { value: 1 as number | null }]));

describe("searchMonitors", () => {
	it("orders exact, then prefix, then substring, case-insensitively", () => {
		const monitors = [
			monitor("1", "North Fresno"),
			monitor("2", "Fresno Airport"),
			monitor("3", "FRESNO"),
			monitor("4", "Clovis")
		];
		const found = searchMonitors("fresno", monitors, withValue("1", "2", "3", "4"));
		expect(found.map((m) => m.id)).toEqual(["3", "2", "1"]);
	});

	it("returns at most 4", () => {
		const monitors = Array.from({ length: 6 }, (_, i) => monitor(String(i), `Fresno ${i}`));
		const found = searchMonitors("fresno", monitors, withValue("0", "1", "2", "3", "4", "5"));
		expect(found).toHaveLength(4);
	});

	it("skips monitors with a null or missing reading", () => {
		const monitors = [monitor("1", "Fresno A"), monitor("2", "Fresno B"), monitor("3", "Fresno C")];
		const latest = new Map<string, { value: number | null }>([
			["1", { value: null }],
			["2", { value: 0 }]
		]);
		expect(searchMonitors("fresno", monitors, latest).map((m) => m.id)).toEqual(["2"]);
	});
});

describe("geocodeQuery", () => {
	it("passes the key and proximity, and maps features", async () => {
		vi.mocked(geocoding.forward).mockResolvedValueOnce({
			features: [{ place_name: "x" }]
		} as never);
		const out = await geocodeQuery("fresno ca", [-119.8, 36.76], "key");
		expect(vi.mocked(geocoding.forward).mock.calls[0][1]).toMatchObject({
			apiKey: "key",
			proximity: [-119.8, 36.76]
		});
		expect(out).toHaveLength(1);
	});

	it("returns [] on failure", async () => {
		vi.mocked(geocoding.forward).mockRejectedValueOnce(new Error("no"));
		expect(await geocodeQuery("q", [0, 0], "key")).toEqual([]);
	});
});
