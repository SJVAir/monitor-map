import type { MapContext, MapPlugin, PluginOptions } from "@sjvair/map-sdk";

export interface FakeMap {
	map: MapContext;
	/** Every addPlugin call, in order. */
	added: Array<{ plugin: MapPlugin; options: PluginOptions | undefined }>;
	/** Every removePlugin id, in order. */
	removed: string[];
	/** The plugin ids, bottom first. */
	ids(): string[];
}

export interface FakeMapOptions {
	/** Runs inside `addPlugin`, as map-sdk's plugin setup does; returns the plugin's teardown. */
	onAdd?(plugin: MapPlugin): () => void;
}

/** A MapContext that only keeps its plugin list (as `$state`), as createMap's does. */
export function fakeMap(setup: FakeMapOptions = {}): FakeMap {
	let plugins = $state.raw<MapPlugin[]>([]);
	const added: FakeMap["added"] = [];
	const removed: string[] = [];
	const teardowns: Record<string, () => void> = {};
	const map = {
		get plugins() {
			return plugins;
		},
		addPlugin(plugin: MapPlugin, options?: PluginOptions) {
			if (plugins.some((p) => p.id === plugin.id)) throw new Error(`${plugin.id} already added`);
			added.push({ plugin, options });
			const at = options?.before ? plugins.findIndex((p) => p.id === options.before) : -1;
			if (options?.before && at < 0) throw new Error(`no plugin ${options.before}`);
			plugins = at < 0 ? [...plugins, plugin] : plugins.toSpliced(at, 0, plugin);
			const teardown = setup.onAdd?.(plugin);
			if (teardown) teardowns[plugin.id] = teardown;
		},
		removePlugin(id: string) {
			removed.push(id);
			teardowns[id]?.();
			delete teardowns[id];
			plugins = plugins.filter((p) => p.id !== id);
		}
	} as unknown as MapContext;
	return { map, added, removed, ids: () => plugins.map((p) => p.id) };
}

/** Runs `fn` inside an effect root, as a component would; returns its teardown. */
export function inEffectRoot(fn: () => void): () => void {
	return $effect.root(fn);
}

/**
 * Stands in for map-sdk's `PluginContext.effect`: `effect(id)` creates an `$effect.root` holding
 * an `$effect` that reads `value` and counts its runs per plugin id. Pass `effect` as `onAdd`.
 */
export function pluginEffectProbe() {
	let value = $state(0);
	const runs: Record<string, number> = {};
	return {
		runs,
		bump() {
			value++;
		},
		effect(id: string): () => void {
			return $effect.root(() => {
				$effect(() => {
					void value;
					runs[id] = (runs[id] ?? 0) + 1;
				});
			});
		}
	};
}
