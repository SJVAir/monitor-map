import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { flushSync } from "svelte";
import type { MapPlugin } from "@sjvair/map-sdk";
import { syncPlugins, type PluginFactories } from "$lib/map/sync-plugins.svelte.js";
import { mapOptions } from "$lib/options/map-options.svelte.js";
import { defaultMapOptions } from "$lib/options/map-option-defaults";
import { wantedPlugins } from "$lib/options/plugin-order";
import { fakeMap, inEffectRoot, pluginEffectProbe, type FakeMap } from "./fake-map.svelte.js";

const plugin = (id: string) => ({ id }) as unknown as MapPlugin;
const factories: PluginFactories = {
	wind: () => plugin("wind"),
	monitors: () => ({ plugin: plugin("monitors"), options: { selectionMode: "single" } })
};

let fake: FakeMap;
let stop: (() => void) | undefined;

async function start(target: FakeMap = fakeMap()) {
	fake = target;
	stop = inEffectRoot(() => {
		syncPlugins(
			target.map,
			() => wantedPlugins(mapOptions, "pm25"),
			factories,
			() => mapOptions.clustered
		);
	});
	await settle();
}

/** Flushes effects, then the microtask a sync pass may be scheduled in, then effects again. */
async function settle() {
	flush();
	await Promise.resolve();
	flush();
}

let flushing = false;

function flush() {
	flushing = true;
	try {
		flushSync();
	} finally {
		flushing = false;
	}
}

describe("syncPlugins", () => {
	beforeEach(() => {
		Object.assign(mapOptions, defaultMapOptions(), { fireAndSmoke: false });
	});

	afterEach(() => {
		stop?.();
		stop = undefined;
	});

	it("adds the wanted plugins that have a factory, with their options", async () => {
		mapOptions.fireAndSmoke = true; // wanted, but no factory yet: skipped
		await start();
		expect(fake.ids()).toEqual(["monitors"]);
		expect(fake.added[0].options).toEqual({ selectionMode: "single", before: undefined });
	});

	it("adds a plugin below the first present plugin above it", async () => {
		await start();
		mapOptions.wind = true;
		await settle();
		expect(fake.ids()).toEqual(["wind", "monitors"]);
		expect(fake.added.at(-1)?.plugin.id).toBe("wind");
		expect(fake.added.at(-1)?.options?.before).toBe("monitors");
	});

	it("removes a plugin that is no longer wanted", async () => {
		mapOptions.wind = true;
		await start();
		mapOptions.wind = false;
		await settle();
		expect(fake.removed).toEqual(["wind"]);
		expect(fake.ids()).toEqual(["monitors"]);
	});

	it("rebuilds present plugins with a fresh object when a dep changes", async () => {
		await start();
		const first = fake.map.plugins[0];
		mapOptions.clustered = false;
		await settle();
		expect(fake.removed).toEqual(["monitors"]);
		expect(fake.ids()).toEqual(["monitors"]);
		expect(fake.map.plugins[0]).not.toBe(first);
		expect(fake.added.at(-1)?.options?.selectionMode).toBe("single");
	});

	it("does not rebuild for an option change that leaves the wanted set as it is", async () => {
		await start();
		mapOptions.evLevels.lvl2 = false; // EV chargers are off
		await settle();
		expect(fake.removed).toEqual([]);
		expect(fake.added).toHaveLength(1);
	});

	it("adds the same set to a new map after a remount", async () => {
		mapOptions.wind = true;
		await start();
		const before = fake.ids();
		stop?.();
		await start(fakeMap());
		expect(fake.ids()).toEqual(before);
		expect(fake.ids()).toEqual(["wind", "monitors"]);
	});

	it("adds plugins outside effect execution, so their setup roots are not owned by it", async () => {
		// map-sdk's plugin setup creates `$effect.root`s. Created while syncPlugins' effect ran,
		// they were its children; when it re-ran, Svelte detached them, and a root detached
		// while scheduled never ran again: the monitors stopped drawing after a Marker
		// Clusters toggle and a pollutant switch. Effects only run inside `flushSync` here.
		const probe = pluginEffectProbe();
		const duringFlush: string[] = [];
		await start(
			fakeMap({
				onAdd: (p) => {
					if (flushing) duringFlush.push(p.id);
					return probe.effect(p.id);
				}
			})
		);
		mapOptions.clustered = false; // rebuild
		await settle();
		mapOptions.wind = true; // wanted change
		await settle();
		expect(fake.ids()).toEqual(["wind", "monitors"]);
		expect(duringFlush).toEqual([]);
		const before = probe.runs.monitors;
		probe.bump();
		await settle();
		expect(probe.runs.monitors).toBe(before + 1);
	});

	it("coalesces changes before the pass into one pass with the latest wanted set", async () => {
		await start();
		mapOptions.wind = true;
		flush();
		mapOptions.wind = false;
		flush();
		await settle();
		expect(fake.added).toHaveLength(1);
		expect(fake.removed).toEqual([]);
	});

	it("skips a pass scheduled before the owner was destroyed", async () => {
		fake = fakeMap();
		stop = inEffectRoot(() => {
			syncPlugins(fake.map, () => wantedPlugins(mapOptions, "pm25"), factories);
		});
		flush();
		stop();
		stop = undefined;
		await settle();
		expect(fake.added).toEqual([]);
	});
});
