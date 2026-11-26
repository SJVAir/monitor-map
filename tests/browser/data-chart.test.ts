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
		meta: {
			entryType: (pollutant: string) => ({
				label: pollutant === "pm25" ? "PM2.5" : "O₃",
				scale: null
			})
		}
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

/** A request that stays pending until its signal aborts, then rejects as fetchChartData does. */
function pendingUntilAborted(...[, , , options]: Parameters<typeof fetchChartData>) {
	return new Promise<uPlot.AlignedData>((_, reject) => {
		const signal = options?.signal;
		signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
	});
}

function nextFrames(count = 2): Promise<void> {
	return new Promise((resolve) => {
		const step = (left: number) =>
			left === 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
		step(count);
	});
}

/** The Pacific calendar day, as the range calendar's `data-value` starts. */
function pacificDay(date: Date): string {
	return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(date);
}

beforeEach(async () => {
	await page.viewport(1000, 800);
});

afterEach(() => {
	vi.resetAllMocks();
});

describe("DataChart", () => {
	it.each([
		["resolves empty (a failed request)", () => Promise.resolve([] as uPlot.AlignedData)],
		["rejects", () => Promise.reject(new Error("network"))]
	])(
		"clears the spinner when a refresh supersedes a range change and %s",
		async (_, refreshResult) => {
			const errors = vi.spyOn(console, "error").mockImplementation(() => {});
			fetchMock.mockResolvedValueOnce(DATA);
			const screen = await render(DataChart, { monitor: monitor(), pollutant: "pm25" });
			await vi.waitFor(() => expect(uPlotMock).toHaveBeenCalled());

			// Pick yesterday through today: the range stays live, and its load hangs.
			fetchMock.mockImplementationOnce(pendingUntilAborted);
			await screen.getByRole("button", { name: /–/ }).click();
			const now = Date.now();
			for (const day of [pacificDay(new Date(now - 86_400_000)), pacificDay(new Date(now))]) {
				const cell = document.querySelector(`[data-bits-day][data-value^="${day}"]`);
				await page.elementLocator(cell as HTMLElement).click();
			}
			await expect.element(screen.getByText(/Loading Data/)).toBeVisible();
			expect(fetchMock).toHaveBeenCalledTimes(2);

			// The 2-minute refresh supersedes it, and fails.
			fetchMock.mockImplementationOnce(refreshResult);
			await screen.rerender({ refreshTick: 1 });
			expect(fetchMock).toHaveBeenCalledTimes(3);

			await expect.element(screen.getByText(/Loading Data/)).not.toBeInTheDocument();
			errors.mockRestore();
		}
	);

	it("titles the chart with the metadata's label", async () => {
		fetchMock.mockResolvedValue(DATA);
		const screen = await render(DataChart, { monitor: monitor(), pollutant: "pm25" });

		await expect.element(screen.getByRole("heading", { name: "PM2.5 Readings" })).toBeVisible();
	});

	it("does not rebuild the chart for a new object describing the same monitor", async () => {
		fetchMock.mockResolvedValue(DATA);
		const screen = await render(DataChart, { monitor: monitor(), pollutant: "pm25" });
		await vi.waitFor(() => expect(uPlotMock).toHaveBeenCalled());
		// Let the first resize observation's rebuild (a frame after it) land too.
		await nextFrames(5);
		const builds = uPlotMock.mock.calls.length;

		await screen.rerender({ monitor: monitor() });
		await nextFrames(5);

		expect(uPlotMock).toHaveBeenCalledTimes(builds);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
