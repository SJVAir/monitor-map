import { untrack } from "svelte";
import type { MapContext, MapPlugin, PluginOptions } from "@sjvair/map-sdk";
import { beforeId, DRAW_ORDER, type PluginKey } from "../options/plugin-order";

/** A plugin, or a plugin with the add options it needs (e.g. its selection mode). */
export type PluginEntry =
	MapPlugin | { plugin: MapPlugin; options?: Omit<PluginOptions, "before"> };

/**
 * Builds a fresh plugin for each key (plugin objects are single-use). Called untracked. A key
 * with no factory is never added, and never removed either: another `syncPlugins` call may own it.
 */
export type PluginFactories = Partial<Record<PluginKey, () => PluginEntry>>;

function entryOf(entry: PluginEntry): { plugin: MapPlugin; options?: PluginOptions } {
	return "plugin" in entry ? entry : { plugin: entry };
}

/**
 * Keeps `map`'s plugins in step with `wanted()`, in `DRAW_ORDER`: adds a wanted plugin below the
 * first present plugin above it and removes one that is no longer wanted. A change to anything
 * `deps()` reads removes and re-adds every present plugin of `factories` (e.g. `clustered`,
 * which a plugin only takes when it is built). Call it during component setup.
 */
export function syncPlugins(
	map: MapContext,
	wanted: () => Set<PluginKey>,
	factories: PluginFactories,
	deps?: () => unknown
): void {
	const keys = DRAW_ORDER.filter((key) => factories[key]);
	// Bumped when a dep changes; separate from `wanted` so an option change that leaves the
	// wanted set as it is never rebuilds anything.
	let generation = $state(0);
	let built = 0;

	if (deps) {
		let first = true;
		$effect(() => {
			deps();
			if (first) first = false;
			else untrack(() => generation++);
		});
	}

	$effect(() => {
		const want = wanted();
		const current = generation;
		untrack(() => {
			const rebuild = current !== built;
			built = current;
			// A scratch copy of the ids for this pass; nothing reads it reactively.
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const present = new Set(map.plugins.map((p) => p.id));
			for (const key of keys) {
				if (present.has(key) && (rebuild || !want.has(key))) {
					map.removePlugin(key);
					present.delete(key);
				}
			}
			for (const key of keys) {
				if (!want.has(key) || present.has(key)) continue;
				const { plugin, options } = entryOf(factories[key]!());
				map.addPlugin(plugin, { ...options, before: beforeId(key, present) });
				present.add(key);
			}
		});
	});
}
