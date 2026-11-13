import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";
import type { OptionValues } from "@sjvair/map-sdk";
import "../../src/app.css";
import {
	mapOptions,
	MONITOR_MAP_DEFAULTS,
	monitorsDisplay
} from "$lib/options/option-values.svelte.js";
import ToolbarHarness from "./ToolbarHarness.svelte";

beforeEach(async () => {
	for (const key of Object.keys(mapOptions)) delete mapOptions[key];
	monitorsDisplay.monitorsOn = true;
	await page.viewport(1280, 800);
});

async function setup() {
	const onchanged = vi.fn<(next: OptionValues, changed: string[]) => void>();
	const screen = await render(ToolbarHarness, { onchanged });
	const triggers = () =>
		Array.from(screen.container.querySelectorAll<HTMLButtonElement>(".mapsdk-options-trigger"));
	const trigger = (label: string) => {
		const found = triggers().find((b) => b.textContent?.trim() === label);
		if (!found) throw new Error(`no trigger "${label}"`);
		return found;
	};
	return { screen, onchanged, triggers, trigger };
}

describe("monitor-map's options toolbar", () => {
	it("shows the triggers in order", async () => {
		const { triggers } = await setup();
		await expect
			.poll(() => triggers().map((b) => b.textContent?.trim()))
			.toEqual([
				"PM2.5",
				"mapsdk_options_monitors",
				"mapsdk_options_layers",
				"mapsdk_options_overlays",
				"mapsdk_options_settings"
			]);
	});

	it("turns monitors off and disables Monitors when None is picked", async () => {
		const { screen, trigger } = await setup();
		await expect.poll(() => trigger("PM2.5")).toBeTruthy();
		trigger("PM2.5").click();
		await screen.getByRole("radio", { name: "mapsdk_options_none" }).click();
		expect(monitorsDisplay.monitorsOn).toBe(false);
		await expect.poll(() => trigger("mapsdk_options_monitors").disabled).toBe(true);
	});

	it("flips a whole monitor group in one change", async () => {
		const { screen, onchanged, trigger } = await setup();
		await expect.poll(() => trigger("mapsdk_options_monitors")).toBeTruthy();
		trigger("mapsdk_options_monitors").click();
		const heading = screen.getByRole("checkbox", { name: "Reference-grade" });
		await expect.element(heading).toBeChecked();
		onchanged.mockClear();
		await heading.click();
		expect(onchanged).toHaveBeenCalledTimes(1);
		expect(onchanged.mock.calls[0][1]).toEqual(["type:airnow"]);
		expect(mapOptions["type:airnow"]).toBe(false);
		expect(mapOptions["type:purpleair"]).toBe(true);
	});

	it("shows the EV levels only while EV Chargers is on", async () => {
		const { screen, trigger } = await setup();
		await expect.poll(() => trigger("mapsdk_options_layers")).toBeTruthy();
		trigger("mapsdk_options_layers").click();
		const ev = screen.getByRole("checkbox", { name: "EV Chargers" });
		await expect.element(screen.getByRole("checkbox", { name: "Level 2" })).not.toBeInTheDocument();
		await ev.click();
		await expect.element(screen.getByRole("checkbox", { name: "Level 2" })).toBeVisible();
		await expect.element(screen.getByRole("checkbox", { name: "Level 3" })).toBeVisible();
		await ev.click();
		await expect.element(screen.getByRole("checkbox", { name: "Level 2" })).not.toBeInTheDocument();
		await expect.element(screen.getByRole("checkbox", { name: "Level 3" })).not.toBeInTheDocument();
	});

	it("puts the defaults back in one change on Reset", async () => {
		const { screen, onchanged, trigger } = await setup();
		await expect.poll(() => trigger("mapsdk_options_overlays")).toBeTruthy();
		trigger("mapsdk_options_overlays").click();
		await screen.getByRole("checkbox", { name: "Wind" }).click();
		trigger("mapsdk_options_monitors").click();
		await screen.getByRole("checkbox", { name: "PurpleAir" }).click();
		expect(mapOptions.wind).toBe(true);
		expect(mapOptions["type:purpleair"]).toBe(false);

		trigger("mapsdk_options_settings").click();
		onchanged.mockClear();
		await screen.getByRole("button", { name: "mapsdk_options_reset" }).click();
		expect(onchanged).toHaveBeenCalledTimes(1);
		expect(mapOptions).toMatchObject(MONITOR_MAP_DEFAULTS);
		expect(mapOptions["type:purpleair"]).toBe(true);
		expect(mapOptions["type:airnow"]).toBe(true);
	});
});
