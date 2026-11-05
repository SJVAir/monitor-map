import { describe, expect, it, vi } from "vitest";
import type { CustomLayerInterface } from "@maptiler/sdk";
import type { PluginContext } from "@sjvair/map-sdk";
import { windPlugin } from "$lib/wind/wind-plugin.js";

function fakeContext() {
	const addCustomLayer = vi.fn((local: string, create: (id: string) => CustomLayerInterface) => {
		const id = `m:wind:${local}`;
		create(id);
		return id;
	});
	return { ctx: { addCustomLayer } as unknown as PluginContext, addCustomLayer };
}

describe("windPlugin", () => {
	it("describes itself", () => {
		const plugin = windPlugin({ createLayer: vi.fn() });
		expect(plugin.id).toBe("wind");
		expect(plugin.label).toBe("Wind");
		expect(plugin.selectable).toBe(false);
		expect(plugin.legend).toBeUndefined();
	});

	it("adds one custom layer under the local id wind", () => {
		const createLayer = vi.fn((id: string) => ({ id }) as unknown as CustomLayerInterface);
		const { ctx, addCustomLayer } = fakeContext();
		windPlugin({ createLayer }).setup(ctx);
		expect(addCustomLayer).toHaveBeenCalledTimes(1);
		expect(addCustomLayer.mock.calls[0][0]).toBe("wind");
		expect(createLayer).toHaveBeenCalledWith("m:wind:wind");
	});

	it("builds a new layer on each setup (a restyle)", () => {
		const layers: CustomLayerInterface[] = [];
		const createLayer = (id: string) => {
			const layer = { id } as unknown as CustomLayerInterface;
			layers.push(layer);
			return layer;
		};
		const plugin = windPlugin({ createLayer });
		const { ctx } = fakeContext();
		plugin.setup(ctx)();
		plugin.setup(ctx);
		expect(layers).toHaveLength(2);
		expect(layers[1]).not.toBe(layers[0]);
	});
});
