import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";
import "../../src/app.css";
import MonitorSubscriptionManager from "$lib/monitors/components/MonitorSubscriptionManager.svelte";
import { loadSubscriptionLevel } from "$lib/monitors/subscriptions";

vi.mock("$lib/monitors/subscriptions", () => ({
	getApiToken: () => "t",
	loadSubscriptionLevel: vi.fn()
}));

vi.mock("$lib/monitors/monitors.svelte.js", () => ({
	monitorsManager: { meta: { entryType: () => ({ scale: { levels: [] } }) } }
}));

const loadMock = vi.mocked(loadSubscriptionLevel);
const unhandled = vi.fn();
const onUnhandled = (event: PromiseRejectionEvent) => {
	event.preventDefault();
	unhandled(event);
};

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	loadMock.mockReset();
	unhandled.mockReset();
	errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	window.addEventListener("unhandledrejection", onUnhandled);
});

afterEach(() => {
	window.removeEventListener("unhandledrejection", onUnhandled);
	errorSpy.mockRestore();
});

describe("MonitorSubscriptionManager load errors", () => {
	it("shows an error with Try again, and recovers on retry", async () => {
		loadMock.mockRejectedValueOnce(new Error("500"));
		render(MonitorSubscriptionManager, { monitorId: "m1" });

		await expect.element(page.getByText("Couldn't load your alert settings.")).toBeVisible();
		await expect.element(page.getByRole("button", { name: "Try again" })).toBeVisible();
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(unhandled).not.toHaveBeenCalled();
		expect(errorSpy).toHaveBeenCalledTimes(1);

		loadMock.mockResolvedValueOnce("unhealthy");
		await page.getByRole("button", { name: "Try again" }).click();
		await expect.element(page.getByText("Manage Subscription")).toBeVisible();
		await expect
			.element(page.getByText("Couldn't load your alert settings."))
			.not.toBeInTheDocument();
	});

	it("shows nothing and logs nothing when the load is aborted by unmount", async () => {
		loadMock.mockImplementation(
			(_id, options) =>
				new Promise((_resolve, reject) => {
					options?.signal?.addEventListener("abort", () => reject(options.signal?.reason));
				})
		);
		const screen = await render(MonitorSubscriptionManager, { monitorId: "m1" });
		screen.unmount();
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(document.body.textContent).not.toContain("Couldn't load");
		expect(errorSpy).not.toHaveBeenCalled();
		expect(unhandled).not.toHaveBeenCalled();
	});
});
