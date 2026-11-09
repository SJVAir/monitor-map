import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";
import type { MapContext } from "@sjvair/map-sdk";
import "../../src/app.css";
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

describe("when a monitor panel opens", () => {
	const narrow = () => page.viewport(375, 667);
	const wide = () => page.viewport(1280, 800);
	const header = (screen: Awaited<ReturnType<typeof render>>) =>
		screen.getByRole("button", { name: "Legend" });

	it("collapses on a narrow screen, and reopens when the panel closes", async () => {
		await narrow();
		const screen = await render(Legend, { map: fakeMap(true), panelOpen: false });
		await expect.element(header(screen)).toHaveAttribute("aria-expanded", "true");
		await screen.rerender({ panelOpen: true });
		await expect.element(header(screen)).toHaveAttribute("aria-expanded", "false");
		await screen.rerender({ panelOpen: false });
		await expect.element(header(screen)).toHaveAttribute("aria-expanded", "true");
	});

	it("starts collapsed when mounted with the panel open on a narrow screen", async () => {
		await narrow();
		const screen = await render(Legend, { map: fakeMap(true), panelOpen: true });
		await expect.element(header(screen)).toHaveAttribute("aria-expanded", "false");
	});

	it("doesn't collapse on a wide screen", async () => {
		await wide();
		const screen = await render(Legend, { map: fakeMap(true), panelOpen: false });
		await screen.rerender({ panelOpen: true });
		await expect.element(header(screen)).toHaveAttribute("aria-expanded", "true");
	});

	it("stays collapsed after the panel closes if the user collapsed it", async () => {
		await narrow();
		const screen = await render(Legend, { map: fakeMap(true), panelOpen: false });
		await screen.rerender({ panelOpen: true });
		await header(screen).click();
		await header(screen).click();
		await screen.rerender({ panelOpen: false });
		await expect.element(header(screen)).toHaveAttribute("aria-expanded", "false");
	});

	it("stays expanded after the panel closes if the user re-expanded it", async () => {
		await narrow();
		const screen = await render(Legend, { map: fakeMap(true), panelOpen: false });
		await screen.rerender({ panelOpen: true });
		await header(screen).click();
		await screen.rerender({ panelOpen: false });
		await expect.element(header(screen)).toHaveAttribute("aria-expanded", "true");
	});

	it("doesn't reopen what the user closed before the panel opened", async () => {
		await narrow();
		const screen = await render(Legend, { map: fakeMap(true), panelOpen: false });
		await header(screen).click();
		await screen.rerender({ panelOpen: true });
		await screen.rerender({ panelOpen: false });
		await expect.element(header(screen)).toHaveAttribute("aria-expanded", "false");
	});

	it("doesn't collapse again while the panel stays open", async () => {
		await narrow();
		const screen = await render(Legend, { map: fakeMap(true), panelOpen: false });
		await screen.rerender({ panelOpen: true });
		await header(screen).click();
		await screen.rerender({ panelOpen: true });
		await expect.element(header(screen)).toHaveAttribute("aria-expanded", "true");
	});
});

it("scrolls its scales instead of growing past its container", async () => {
	const levels = [{ min: 0, color: "#00e400", label: "Good", opacity: null }];
	const plugins = ["a", "b", "c", "d", "e"].map((id) => ({
		id,
		legend: () => ({ pluginId: id, title: id, units: "", scale: { kind: "range", levels } })
	}));
	const map = { plugins, format, messages: (key: string) => key } as unknown as MapContext;
	const screen = await render(Legend, { map });
	const host = screen.container as HTMLElement;
	host.style.cssText =
		"height: 160px; display: flex; flex-direction: column; justify-content: flex-end";

	const header = screen.getByRole("button", { name: "Legend" });
	const card = header.element().parentElement!;
	const body = card.lastElementChild as HTMLElement;
	await expect.poll(() => card.getBoundingClientRect().height).toBeLessThanOrEqual(160);
	expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
	await expect.element(header).toBeVisible();
});
