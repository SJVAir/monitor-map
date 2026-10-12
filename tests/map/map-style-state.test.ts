import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MapStyleState } from "$lib/map/map-style-state.svelte.js";

type Handler = (event: { error?: unknown }) => void;

function variant(id: string, reference: object) {
	return {
		id,
		getType: () => id,
		getReferenceStyle: () => reference,
		getExpandedStyleURL: () => `https://tiles.test/maps/${id}/style.json`
	};
}

const streets = {};
const satellite = {};
const DEFAULT = variant("default", streets);
const DARK = variant("dark", streets);
const PASTEL = variant("pastel", streets);
const HYBRID = variant("hybrid", satellite);

function fakeMap() {
	const handlers = new Map<string, Set<Handler>>();
	return {
		setStyle: vi.fn(),
		on: (name: string, handler: Handler) => {
			if (!handlers.has(name)) handlers.set(name, new Set());
			handlers.get(name)!.add(handler);
		},
		off: (name: string, handler: Handler) => handlers.get(name)?.delete(handler),
		emit: (name: string, event: { error?: unknown } = {}) => {
			for (const handler of [...(handlers.get(name) ?? [])]) handler(event);
		},
		listeners: (name: string) => handlers.get(name)?.size ?? 0
	};
}

const mocks = vi.hoisted(() => ({
	mapManager: { map: null as unknown, styleLoading: false },
	refresh: vi.fn()
}));
vi.mock("$lib/map/map-manager.svelte.js", () => ({
	mapManager: mocks.mapManager,
	get DefaultMapStyle() {
		return DEFAULT;
	}
}));
vi.mock("$lib/map/integrations/integrations-manager", () => ({
	integrationsManager: { refresh: mocks.refresh }
}));

const styleFailure = (v: { getExpandedStyleURL(): string }) => ({
	error: { url: `${v.getExpandedStyleURL()}?key=abc` }
});

let state: MapStyleState;
let map: ReturnType<typeof fakeMap>;
// The fakes only implement the slice of MapStyleVariant the module uses.
const select = (v: unknown) => state.selectVariant(v as Parameters<typeof state.selectVariant>[0]);

beforeEach(async () => {
	map = fakeMap();
	mocks.mapManager.map = map;
	mocks.mapManager.styleLoading = false;
	mocks.refresh.mockReset();
	vi.resetModules();
	state = (await import("$lib/map/map-style-state.svelte.js")).mapStyleState;
});

describe("mapStyleState", () => {
	it("refreshes the integrations once the new style loads", () => {
		select(DARK);

		expect(map.setStyle).toHaveBeenCalledWith(DARK);
		expect(mocks.mapManager.styleLoading).toBe(true);
		expect(mocks.refresh).not.toHaveBeenCalled();

		map.emit("style.load");

		expect(mocks.mapManager.styleLoading).toBe(false);
		expect(mocks.refresh).toHaveBeenCalledTimes(1);
		expect(map.listeners("style.load")).toBe(0);
		expect(map.listeners("error")).toBe(0);
	});

	it("does not reload the variant already applied", () => {
		select(DEFAULT);

		expect(map.setStyle).not.toHaveBeenCalled();
		expect(mocks.mapManager.styleLoading).toBe(false);
	});

	it("goes back to the last loaded style when the new one fails to load", () => {
		select(HYBRID);
		state.referenceStyle = satellite as typeof state.referenceStyle;
		map.emit("error", styleFailure(HYBRID));

		expect(map.setStyle.mock.calls).toEqual([[HYBRID], [DEFAULT]]);
		expect(state.variant).toBe(DEFAULT);
		expect(state.referenceStyle).toBe(streets);
		// Still loading: the fallback has to arrive before integrations may touch the style.
		expect(mocks.mapManager.styleLoading).toBe(true);
		expect(mocks.refresh).not.toHaveBeenCalled();

		map.emit("style.load");

		expect(mocks.mapManager.styleLoading).toBe(false);
		expect(mocks.refresh).toHaveBeenCalledTimes(1);
	});

	it("falls back to the last style that loaded, not the last one requested", () => {
		select(DARK);
		map.emit("style.load");
		select(PASTEL);
		select(HYBRID);
		map.emit("error", styleFailure(HYBRID));

		expect(map.setStyle).toHaveBeenLastCalledWith(DARK);
		expect(state.variant).toBe(DARK);
	});

	it("ignores errors that are not the style request failing", () => {
		select(DARK);
		map.emit("error", { error: { url: "https://tiles.test/tiles/7/21/49.pbf?key=abc" } });
		map.emit("error", { error: new Error("sprite") });
		map.emit("error", styleFailure(PASTEL));

		expect(map.setStyle).toHaveBeenCalledTimes(1);
		expect(mocks.mapManager.styleLoading).toBe(true);
		expect(state.variant).toBe(DARK);
	});

	it("lets a newer change supersede one still loading", () => {
		select(DARK);
		select(PASTEL);
		map.emit("error", styleFailure(DARK));

		expect(map.setStyle.mock.calls).toEqual([[DARK], [PASTEL]]);
		expect(state.variant).toBe(PASTEL);

		map.emit("style.load");

		expect(mocks.refresh).toHaveBeenCalledTimes(1);
		expect(mocks.mapManager.styleLoading).toBe(false);
	});

	it("stops when the fallback fails too, and tries again on the next selection", () => {
		select(DARK);
		map.emit("error", styleFailure(DARK));
		map.emit("error", styleFailure(DEFAULT));

		expect(map.setStyle.mock.calls).toEqual([[DARK], [DEFAULT]]);
		// No style to draw on, so integrations stay held off.
		expect(mocks.mapManager.styleLoading).toBe(true);
		expect(mocks.refresh).not.toHaveBeenCalled();
		expect(map.listeners("error")).toBe(0);

		select(DEFAULT);
		expect(map.setStyle).toHaveBeenCalledTimes(3);
		map.emit("style.load");

		expect(mocks.mapManager.styleLoading).toBe(false);
		expect(mocks.refresh).toHaveBeenCalledTimes(1);
	});
});
