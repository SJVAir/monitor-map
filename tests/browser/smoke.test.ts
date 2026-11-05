import { expect, test } from "vitest";
import { render } from "vitest-browser-svelte";
import DataBox from "$lib/components/DataBox.svelte";

test("DataBox renders its value", async () => {
	const screen = await render(DataBox, { value: "12", color: "#00e400", header: "PM2.5" });
	await expect.element(screen.getByText("12")).toBeVisible();
});
