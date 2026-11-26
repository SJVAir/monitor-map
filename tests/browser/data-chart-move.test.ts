import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";
import uPlot from "uplot";
import DataChart from "$lib/data-chart/DataChart.svelte";
import { fetchChartData, type ChartMonitor } from "$lib/data-chart/requests";

vi.mock("uplot", () => ({
	default: vi.fn(function () {
		return { destroy: vi.fn() };
	})
}));

vi.mock("$lib/data-chart/requests", () => ({ fetchChartData: vi.fn() }));

vi.mock("$lib/monitors/monitors.svelte.js", () => ({
	monitorsManager: {
		meta: { entryType: () => ({ label: "PM2.5", scale: null }) }
	}
}));

const fetchMock = vi.mocked(fetchChartData);
const uPlotMock = vi.mocked(uPlot);

const monitor = (): ChartMonitor =>
	({
		id: "m1",
		name: "Test Monitor",
		type: "purpleair",
		data_source: { name: "PurpleAir", url: "https://example.com" }
	}) as ChartMonitor;

const DATA: uPlot.AlignedData = [
	[1_700_000_000, 1_700_000_120],
	[4, 6]
];

type MoveBefore = (node: Node, child: Node | null) => void;
const proto = Element.prototype as unknown as { moveBefore?: MoveBefore };
const nativeMoveBefore = proto.moveBefore;

let mountpoint: HTMLElement;
let panel: HTMLElement;
let after: HTMLElement;

beforeEach(async () => {
	await page.viewport(1000, 800);
	// The widget's layout: the chart sits inside the panel, the panel inside the mountpoint.
	mountpoint = document.createElement("div");
	mountpoint.id = "SJVAirMonitorMap";
	mountpoint.innerHTML = `<div class="map"></div><div class="panel"><p class="after">after</p></div>`;
	document.body.append(mountpoint);
	panel = mountpoint.querySelector(".panel")!;
	after = mountpoint.querySelector(".after")!;
});

afterEach(() => {
	if (nativeMoveBefore) proto.moveBefore = nativeMoveBefore;
	mountpoint.remove();
	vi.resetAllMocks();
});

async function renderChart() {
	fetchMock.mockResolvedValue(DATA);
	// The chart mounts before the panel's trailing content, as the detail panel places it.
	const target = document.createElement("div");
	panel.insertBefore(target, after);
	await render(DataChart, {
		target,
		props: { monitor: monitor(), pollutant: "pm25" }
	});
	const backdrop = target.querySelector<HTMLElement>(".backdrop")!;
	return { target, backdrop };
}

describe.each([
	["without Element.moveBefore (WebKit)", false],
	["with Element.moveBefore", true]
])("DataChart %s", (_, native) => {
	beforeEach(() => {
		if (!native) delete proto.moveBefore;
	});

	it.skipIf(native && !nativeMoveBefore)("starts loading its data on mount", async () => {
		await renderChart();

		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
		await vi.waitFor(() => expect(uPlotMock).toHaveBeenCalled());
	});

	it.skipIf(native && !nativeMoveBefore)(
		"expands over the mountpoint and collapses back into its place",
		async () => {
			const { target, backdrop } = await renderChart();
			await vi.waitFor(() => expect(uPlotMock).toHaveBeenCalled());

			// Page queries: the expanded chart leaves the render container.
			const builds = uPlotMock.mock.calls.length;
			const toggle = page.getByRole("button", { name: "Expand Chart" });
			await toggle.click();
			await expect.element(page.getByRole("button", { name: "Collapse" })).toBeVisible();
			expect(mountpoint.firstElementChild).toBe(backdrop);
			expect(backdrop.classList.contains("expanded")).toBe(true);
			// The moved toggle keeps focus, so a keyboard user can collapse it again.
			expect(document.activeElement).toBe(page.getByRole("button", { name: "Collapse" }).element());
			// The chart redraws at the expanded size.
			await vi.waitFor(() => expect(uPlotMock.mock.calls.length).toBeGreaterThan(builds));

			await page.getByRole("button", { name: "Collapse" }).click();
			await expect.element(page.getByRole("button", { name: "Expand Chart" })).toBeVisible();
			expect(backdrop.parentElement).toBe(target);
			expect(target.nextElementSibling).toBe(after);
			expect(backdrop.classList.contains("expanded")).toBe(false);
			expect(document.activeElement).toBe(
				page.getByRole("button", { name: "Expand Chart" }).element()
			);
		}
	);
});
