import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MapIconManager } from "$lib/map/integrations/map-icon-manager";

function deferred() {
	let resolve!: () => void;
	const promise = new Promise<void>((res) => (resolve = res));
	return { promise, resolve };
}

function fakeMap() {
	const layers = new Set<string>();
	const sources = new Set<string>();
	return {
		layers,
		sources,
		getLayer: (id: string) => (layers.has(id) ? { id } : undefined),
		getSource: (id: string) => (sources.has(id) ? { id } : undefined),
		addLayer: vi.fn((layer: { id: string }) => layers.add(layer.id)),
		addSource: vi.fn((id: string) => sources.add(id)),
		removeLayer: (id: string) => layers.delete(id),
		removeSource: (id: string) => sources.delete(id),
		setLayoutProperty: vi.fn()
	};
}

const mocks = vi.hoisted(() => ({
	mapManager: { map: null as unknown, styleLoading: false }
}));
vi.mock("$lib/map/map-manager.svelte.js", () => ({ mapManager: mocks.mapManager }));

// Lets every already-resolved promise chain run before the next assertion.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

let map: ReturnType<typeof fakeMap>;
let pending: Array<ReturnType<typeof deferred>>;

async function createIntegration() {
	const { MapIconLayerIntegration } =
		await import("$lib/map/integrations/map-geojson-integration.svelte.js");

	class TestIntegration extends MapIconLayerIntegration {
		referenceId = "test";
		enabled = true;
		features = [];
		mapSource = {
			type: "geojson" as const,
			data: { type: "FeatureCollection" as const, features: [] }
		};
		mapLayer = { id: "test", type: "symbol" as const, source: "test" };
		icons = {
			loadIcons: () => {
				const next = deferred();
				pending.push(next);
				return next.promise;
			}
		} as unknown as MapIconManager;
		extra = vi.fn();

		/** Mirrors a subclass with a second mode that schedules its own work after the icons. */
		applyOther() {
			this.supersedePending();
			this.whenIconsLoad(this.extra);
		}
	}

	return new TestIntegration();
}

beforeEach(() => {
	map = fakeMap();
	pending = [];
	mocks.mapManager.map = map;
	mocks.mapManager.styleLoading = false;
});

describe("MapIconLayerIntegration", () => {
	it("adds its source and layer once the icons load", async () => {
		const integration = await createIntegration();

		integration.apply();
		expect(map.sources.size).toBe(0);

		pending[0].resolve();
		await flush();

		expect([...map.sources]).toEqual(["test"]);
		expect([...map.layers]).toEqual(["test"]);
	});

	it("adds nothing when removed while the icons were loading", async () => {
		const integration = await createIntegration();

		integration.apply();
		integration.remove();
		pending[0].resolve();
		await flush();

		expect(map.sources.size).toBe(0);
		expect(map.layers.size).toBe(0);
	});

	it("runs only the latest of several applies still waiting on icons", async () => {
		const integration = await createIntegration();

		integration.apply();
		integration.apply();
		for (const load of pending) load.resolve();
		await flush();

		expect(map.addSource).toHaveBeenCalledTimes(1);
		expect(map.addLayer).toHaveBeenCalledTimes(1);
	});

	it("drops a pending apply when another mode was applied since, and the reverse", async () => {
		const integration = await createIntegration();

		integration.apply();
		integration.applyOther();
		for (const load of pending) load.resolve();
		await flush();

		expect(map.sources.size).toBe(0);
		expect(integration.extra).toHaveBeenCalledTimes(1);

		integration.applyOther();
		integration.apply();
		for (const load of pending) load.resolve();
		await flush();

		expect([...map.layers]).toEqual(["test"]);
		expect(integration.extra).toHaveBeenCalledTimes(1);
	});

	it("adds nothing while a basemap change is in flight", async () => {
		const integration = await createIntegration();

		integration.apply();
		mocks.mapManager.styleLoading = true;
		pending[0].resolve();
		await flush();

		expect(map.sources.size).toBe(0);
	});
});
