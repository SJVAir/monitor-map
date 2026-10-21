import { afterEach, describe, expect, it, vi } from "vitest";

const getMonitorEntries = vi.hoisted(() => vi.fn());
vi.mock("@sjvair/sdk", () => ({ getMonitorEntries }));

import { fetchChartData, type ChartMonitor } from "../../src/lib/data-chart/requests";

const monitor = {
	id: "m1",
	name: "Monitor",
	type: "airnow",
	data_source: { name: "AirNow" }
} as unknown as ChartMonitor;
const range = { start: "2026-10-01T00:00:00Z", end: "2026-10-02T00:00:00Z" };

afterEach(() => {
	getMonitorEntries.mockReset();
	vi.restoreAllMocks();
});

describe("fetchChartData", () => {
	it("passes the signal to the SDK", async () => {
		getMonitorEntries.mockResolvedValue([]);
		const { signal } = new AbortController();
		await fetchChartData(monitor, range, "pm25", { signal });
		expect(getMonitorEntries.mock.calls[0][1]).toEqual({ signal });
	});

	it("rejects with the abort reason when cancelled, without logging", async () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const controller = new AbortController();
		const reason = new Error("superseded");
		getMonitorEntries.mockImplementation(
			(_params, options: { signal: AbortSignal }) =>
				new Promise((_resolve, reject) => {
					options.signal.addEventListener("abort", () => reject(options.signal.reason));
				})
		);
		const promise = fetchChartData(monitor, range, "pm25", { signal: controller.signal });
		controller.abort(reason);
		await expect(promise).rejects.toBe(reason);
		expect(errorSpy).not.toHaveBeenCalled();
	});

	it("still resolves [] and logs on an ordinary failure", async () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		getMonitorEntries.mockRejectedValue(new Error("500"));
		const { signal } = new AbortController();
		await expect(fetchChartData(monitor, range, "pm25", { signal })).resolves.toEqual([]);
		expect(errorSpy).toHaveBeenCalledTimes(1);
	});
});
