import { beforeEach, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";
import "../../src/app.css";
import LegendStackingHarness from "./LegendStackingHarness.svelte";

// The legend sits in MapView's overlays, which render after map-sdk's toolbar and list. These
// check what is actually painted on top where they overlap the expanded legend.

beforeEach(async () => {
	await page.viewport(1440, 700);
});

function legendCard(container: HTMLElement): HTMLElement {
	const header = Array.from(container.querySelectorAll("button")).find(
		(b) => b.textContent?.trim() === "Legend"
	);
	if (!header?.parentElement) throw new Error("no legend card");
	return header.parentElement;
}

/**
 * The element painted at the middle of where `el` and the legend card overlap, or `null` while
 * they don't (yet: the narrow panel slides in).
 */
function hitWhereTheyOverlap(el: Element, legend: Element): Element | null {
	const a = el.getBoundingClientRect();
	const b = legend.getBoundingClientRect();
	const left = Math.max(a.left, b.left);
	const right = Math.min(a.right, b.right);
	const top = Math.max(a.top, b.top);
	const bottom = Math.min(a.bottom, b.bottom);
	if (right - left < 4 || bottom - top < 4) return null;
	return document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
}

async function setup() {
	const screen = await render(LegendStackingHarness);
	const { container } = screen;
	await expect.poll(() => legendCard(container)).toBeTruthy();
	return { screen, container, legend: () => legendCard(container) };
}

it("paints an open toolbar dropdown above the legend", async () => {
	const { container, legend } = await setup();
	const trigger = () =>
		Array.from(container.querySelectorAll<HTMLButtonElement>(".mapsdk-options-trigger")).find(
			(b) => b.textContent?.trim() === "First"
		);
	await expect.poll(trigger).toBeTruthy();
	trigger()!.click();
	const dropdown = () =>
		container.querySelector<HTMLElement>(".mapsdk-options-dropdown:not([hidden])");
	await expect.poll(dropdown).toBeTruthy();

	await expect.poll(() => hitWhereTheyOverlap(dropdown()!, legend())).not.toBeNull();
	const hit = hitWhereTheyOverlap(dropdown()!, legend());
	expect(legend().contains(hit)).toBe(false);
	expect(dropdown()!.contains(hit)).toBe(true);
});

it("paints the List button above the legend", async () => {
	await page.viewport(1440, 330);
	const { container, legend } = await setup();
	const button = () => container.querySelector<HTMLElement>(".mapsdk-list-button");
	await expect.poll(button).toBeTruthy();

	await expect.poll(() => hitWhereTheyOverlap(button()!, legend())).not.toBeNull();
	const hit = hitWhereTheyOverlap(button()!, legend());
	expect(legend().contains(hit)).toBe(false);
	expect(button()!.contains(hit)).toBe(true);
});

it("paints the narrow options panel above the legend", async () => {
	await page.viewport(390, 700);
	const { container, legend } = await setup();
	const open = () => container.querySelector<HTMLButtonElement>(".mapsdk-options-open");
	await expect.poll(open).toBeTruthy();
	open()!.click();
	const panel = () =>
		container.querySelector<HTMLElement>(".mapsdk-options-panel[data-open='true']");
	await expect.poll(panel).toBeTruthy();
	const section = Array.from(
		panel()!.querySelectorAll<HTMLButtonElement>(".mapsdk-options-trigger")
	).find((b) => b.textContent?.trim() === "First");
	section?.click();

	await expect.poll(() => hitWhereTheyOverlap(panel()!, legend())).not.toBeNull();
	// While the panel covers the map, MapView makes the overlays inert, which takes the legend
	// out of hit testing but not out of painting: lift it for the probe.
	const overlay = legend().closest<HTMLElement>("[inert]");
	expect(overlay).not.toBeNull();
	overlay!.inert = false;
	let hit: Element | null;
	try {
		hit = hitWhereTheyOverlap(panel()!, legend());
	} finally {
		overlay!.inert = true;
	}
	expect(legend().contains(hit)).toBe(false);
	expect(panel()!.contains(hit)).toBe(true);
});

it("starts the legend 16px below the toolbar", async () => {
	const { container, legend } = await setup();
	const root = container.querySelector<HTMLElement>(".mapsdk-map")!;
	// LegendOverlay's box: the legend card's nearest ancestor offset by the toolbar's height.
	const overlay = () => {
		let el = legend().parentElement;
		while (el && !el.className.includes("--mapsdk-toolbar-height")) el = el.parentElement;
		return el;
	};
	const toolbarHeight = () =>
		parseFloat(getComputedStyle(root).getPropertyValue("--mapsdk-toolbar-height")) || 0;
	await expect.poll(toolbarHeight).toBeGreaterThan(0);
	expect(overlay()).not.toBeNull();
	await expect
		.poll(() => overlay()!.getBoundingClientRect().top - root.getBoundingClientRect().top)
		.toBe(toolbarHeight() + 16);
});
