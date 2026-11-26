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

/** A MapContext that only keeps its plugin list (as `$state`), as createMap's does. */
export function fakeMap(): FakeMap {
	let plugins = $state.raw<MapPlugin[]>([]);
	const added: FakeMap["added"] = [];
	const removed: string[] = [];
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
		},
		removePlugin(id: string) {
			removed.push(id);
			plugins = plugins.filter((p) => p.id !== id);
		}
	} as unknown as MapContext;
	return { map, added, removed, ids: () => plugins.map((p) => p.id) };
}

/** Runs `fn` inside an effect root, as a component would; returns its teardown. */
export function inEffectRoot(fn: () => void): () => void {
	return $effect.root(fn);
}
