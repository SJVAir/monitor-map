import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import DataBox from "$lib/components/DataBox.svelte";
import { NEUTRAL_LEVEL_COLOR, readingDisplay } from "$lib/levels";

describe("readingDisplay", () => {
	it("cuts a reading off to a whole number, as the map's tooltips do", () => {
		expect(readingDisplay(".5")).toBe("0");
		expect(readingDisplay("4.93")).toBe("4");
		expect(readingDisplay("1e3")).toBe("1000");
		expect(readingDisplay(12.7)).toBe("12");
	});

	it("shows a dash for a missing or non-numeric reading", () => {
		expect(readingDisplay("")).toBe("–");
		expect(readingDisplay("n/a")).toBe("–");
		expect(readingDisplay(null)).toBe("–");
		expect(readingDisplay(undefined)).toBe("–");
	});
});

describe("DataBox", () => {
	it("falls back to the neutral color when given none", async () => {
		const screen = await render(DataBox, { value: "4", color: "", header: "PM2.5" });

		const value = screen.getByText("4");
		await expect.element(value).toBeVisible();
		const box = value.element().closest("div.rounded-sm") as HTMLElement;
		const neutral = document.createElement("div");
		neutral.style.backgroundColor = NEUTRAL_LEVEL_COLOR;
		expect(box.style.backgroundColor).toBe(neutral.style.backgroundColor);
	});
});
