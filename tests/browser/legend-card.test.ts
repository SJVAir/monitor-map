import { expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import type { MapContext } from "@sjvair/map-sdk";
import Legend from "$lib/legend/Legend.svelte";

const format = { number: (n: number) => String(n) };

function fakeMap(withSection: boolean): MapContext {
	const legend = () => ({
		pluginId: "monitors",
		title: "PM2.5",
		units: "µg/m³",
		scale: {
			kind: "range",
			levels: [{ min: 0, color: "#00e400", label: "Good", opacity: null }]
		}
	});
	return {
		plugins: withSection ? [{ id: "monitors", legend }] : [{ id: "monitors" }],
		format,
		messages: (key: string) => key
	} as unknown as MapContext;
}

it("shows an expanded card that collapses from its header", async () => {
	const screen = await render(Legend, { map: fakeMap(true) });
	const header = screen.getByRole("button", { name: "Legend" });
	await expect.element(header).toHaveAttribute("aria-expanded", "true");
	await header.click();
	await expect.element(header).toHaveAttribute("aria-expanded", "false");
});

it("renders nothing when map-sdk's legend has no sections", async () => {
	const screen = await render(Legend, { map: fakeMap(false) });
	expect(screen.container.querySelector("button")).toBeNull();
});
