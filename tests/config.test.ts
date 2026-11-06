import { beforeEach, describe, expect, it, vi } from "vitest";

describe("monitor-map config", () => {
	beforeEach(() => vi.resetModules());

	it("throws before configureMonitorMap", async () => {
		const { monitorMapConfig } = await import("$lib/config.svelte");
		expect(() => monitorMapConfig()).toThrow("call configureMonitorMap() first");
	});

	it("returns what was configured", async () => {
		const m = await import("$lib/config.svelte");
		m.configureMonitorMap({ maptilerKey: "a", nrelKey: "b" });
		expect(m.monitorMapConfig()).toEqual({ maptilerKey: "a", nrelKey: "b" });
	});
});
