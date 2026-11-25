import { expect, it } from "vitest";
import type { DataSource, MonitorFeatureProperties } from "@sjvair/map-sdk/data";
import { mapMonitorsPlugin } from "../../src/lib/monitors/monitors-plugin.js";

const source = {
	status: { state: "ready" },
	scale: null,
	features: { type: "FeatureCollection", features: [] }
} as unknown as DataSource<MonitorFeatureProperties>;

it("leaves no tooltip on a tapped monitor, whose panel opens instead", () => {
	expect(mapMonitorsPlugin(source, { clustered: false }).tooltipOnTouch).toBe(false);
	expect(mapMonitorsPlugin(source, { clustered: true }).tooltipOnTouch).toBe(false);
});

it("is the selectable monitors layer", () => {
	const plugin = mapMonitorsPlugin(source, { clustered: false });
	expect(plugin.id).toBe("monitors");
	expect(plugin.selectable).toBe(true);
});
