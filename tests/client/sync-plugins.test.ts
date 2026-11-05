import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { flushSync } from "svelte";
import type { MapPlugin } from "@sjvair/map-sdk";
import { syncPlugins, type PluginFactories } from "$lib/map/sync-plugins.svelte.js";
import { mapOptions } from "$lib/options/map-options.svelte.js";
import { defaultMapOptions } from "$lib/options/map-option-defaults";
import { wantedPlugins } from "$lib/options/plugin-order";
import { fakeMap, inEffectRoot, type FakeMap } from "./fake-map.svelte.js";

const plugin = (id: string) => ({ id }) as unknown as MapPlugin;
const factories: PluginFactories = {
	wind: () => plugin("wind"),
	monitors: () => ({ plugin: plugin("monitors"), options: { selectionMode: "single" } })
};

let fake: FakeMap;
let stop: (() => void) | undefined;

function start(target: FakeMap = fakeMap()) {
	fake = target;
	stop = inEffectRoot(() => {
		syncPlugins(
			target.map,
			() => wantedPlugins(mapOptions, "pm25"),
			factories,
			() => mapOptions.clustered
		);
	});
	flushSync();
}

describe("syncPlugins", () => {
	beforeEach(() => {
		Object.assign(mapOptions, defaultMapOptions(), { fireAndSmoke: false });
	});

	afterEach(() => {
		stop?.();
		stop = undefined;
	});

	it("adds the wanted plugins that have a factory, with their options", () => {
		mapOptions.fireAndSmoke = true; // wanted, but no factory yet: skipped
		start();
		expect(fake.ids()).toEqual(["monitors"]);
		expect(fake.added[0].options).toEqual({ selectionMode: "single", before: undefined });
	});

	it("adds a plugin below the first present plugin above it", () => {
		start();
		mapOptions.wind = true;
		flushSync();
		expect(fake.ids()).toEqual(["wind", "monitors"]);
		expect(fake.added.at(-1)?.plugin.id).toBe("wind");
		expect(fake.added.at(-1)?.options?.before).toBe("monitors");
	});

	it("removes a plugin that is no longer wanted", () => {
		mapOptions.wind = true;
		start();
		mapOptions.wind = false;
		flushSync();
		expect(fake.removed).toEqual(["wind"]);
		expect(fake.ids()).toEqual(["monitors"]);
	});

	it("rebuilds present plugins with a fresh object when a dep changes", () => {
		start();
		const first = fake.map.plugins[0];
		mapOptions.clustered = false;
		flushSync();
		expect(fake.removed).toEqual(["monitors"]);
		expect(fake.ids()).toEqual(["monitors"]);
		expect(fake.map.plugins[0]).not.toBe(first);
		expect(fake.added.at(-1)?.options?.selectionMode).toBe("single");
	});

	it("does not rebuild for an option change that leaves the wanted set as it is", () => {
		start();
		mapOptions.evLevels.lvl2 = false; // EV chargers are off
		flushSync();
		expect(fake.removed).toEqual([]);
		expect(fake.added).toHaveLength(1);
	});

	it("adds the same set to a new map after a remount", () => {
		mapOptions.wind = true;
		start();
		const before = fake.ids();
		stop?.();
		start(fakeMap());
		expect(fake.ids()).toEqual(before);
		expect(fake.ids()).toEqual(["wind", "monitors"]);
	});
});
