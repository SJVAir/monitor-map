import { expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";
import "../../src/app.css";
import MapShellHarness from "./MapShellHarness.svelte";

// With the detail panel open at 1024px the map's box is 683px, under map-sdk's 48rem switch. The
// toolbar must follow MapShell's box (1024px), so opening the panel doesn't collapse it.

const openButton = (container: HTMLElement) =>
	container.querySelector<HTMLElement>(".mapsdk-options-open");
const wideTrigger = (container: HTMLElement) =>
	container.querySelector<HTMLElement>(".mapsdk-options-trigger");

it("keeps the wide toolbar when the panel narrows the map at 1024px", async () => {
	await page.viewport(1024, 700);
	const { container } = await render(MapShellHarness);
	await expect.poll(() => wideTrigger(container)).toBeTruthy();
	const map = container.querySelector<HTMLElement>(".mapsdk-map")!;
	expect(map.getBoundingClientRect().width).toBeLessThan(768);
	// map-sdk decides wide or narrow a frame after it measures: let that settle first.
	for (let i = 0; i < 4; i++) await new Promise((r) => requestAnimationFrame(r));
	expect(openButton(container)).toBeNull();
	expect(wideTrigger(container)!.getBoundingClientRect().width).toBeGreaterThan(0);
});

it("shows the options button at 390px", async () => {
	await page.viewport(390, 700);
	const { container } = await render(MapShellHarness);
	await expect.poll(() => openButton(container)).toBeTruthy();
});
