import { expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import "../../src/app.css";
import EvPopup from "$lib/ev-stations/EvPopup.svelte";
import type { EvStation } from "$lib/ev-stations/types";

const station = {
	station_name: "A charging station with a long name that wraps onto two lines",
	facility_type: "Restaurant",
	ev_connector_types: ["CCS"]
} as unknown as EvStation;

it("has a Close button of at least 24×24 px, inset from the edge, clear of the title", async () => {
	const onclose = vi.fn();
	const screen = await render(EvPopup, { station, onclose });
	const button = screen.getByRole("button", { name: "Close" });
	await expect.element(button).toBeVisible();

	const b = button.element().getBoundingClientRect();
	expect(b.width).toBeGreaterThanOrEqual(24);
	expect(b.height).toBeGreaterThanOrEqual(24);

	const root = screen.container.firstElementChild!.getBoundingClientRect();
	expect(root.right - b.right).toBeGreaterThanOrEqual(4);
	expect(b.top - root.top).toBeGreaterThanOrEqual(4);

	// The title's text, line by line (its box spans its side padding).
	const range = document.createRange();
	range.selectNodeContents(screen.getByText(station.station_name).element());
	const lines = [...range.getClientRects()];
	expect(lines.length).toBeGreaterThan(0);
	for (const line of lines) {
		const overlaps =
			line.left < b.right && b.left < line.right && line.top < b.bottom && b.top < line.bottom;
		expect(overlaps).toBe(false);
	}

	await button.click();
	expect(onclose).toHaveBeenCalledOnce();
});
