import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MonitorDetailsState } from "$lib/monitors/monitor-details.svelte.js";

const sdk = vi.hoisted(() => ({ getMonitorDetails: vi.fn() }));
vi.mock("@sjvair/sdk", () => sdk);

const monitor = (id: string, value = "4.9") => ({
	id,
	type: "purpleair",
	latest: { pm25: { value } }
});

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

// The shape the SDK's httpRequest rejects with.
const httpError = (status: number) =>
	new Error("Request failed", { cause: { result: { status } } });

let details: MonitorDetailsState;
let logged: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	sdk.getMonitorDetails.mockReset();
	details = new MonitorDetailsState();
	logged = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	logged.mockRestore();
});

describe("MonitorDetailsState", () => {
	it("starts out loading with no monitor", () => {
		expect(details.status).toBe("loading");
		expect(details.monitor).toBeNull();
	});

	it("loads a monitor", async () => {
		sdk.getMonitorDetails.mockResolvedValue(monitor("a"));

		await details.load("a");

		expect(sdk.getMonitorDetails).toHaveBeenCalledWith("a");
		expect(details.status).toBe("ready");
		expect(details.monitor).toEqual(monitor("a"));
	});

	it("clears the previous monitor while the next one loads", async () => {
		sdk.getMonitorDetails.mockResolvedValueOnce(monitor("a"));
		await details.load("a");
		const next = deferred<ReturnType<typeof monitor>>();
		sdk.getMonitorDetails.mockReturnValueOnce(next.promise);

		const loading = details.load("b");

		expect(details.status).toBe("loading");
		expect(details.monitor).toBeNull();
		next.resolve(monitor("b"));
		await loading;
		expect(details.monitor).toEqual(monitor("b"));
	});

	it("reports an unknown id as not found, without logging", async () => {
		sdk.getMonitorDetails.mockRejectedValue(httpError(404));

		await details.load("nope");

		expect(details.status).toBe("not-found");
		expect(details.monitor).toBeNull();
		expect(logged).not.toHaveBeenCalled();
	});

	it("reports any other failure as failed, and loads on retry", async () => {
		sdk.getMonitorDetails.mockRejectedValueOnce(httpError(500));

		await details.load("a");

		expect(details.status).toBe("failed");
		expect(logged).toHaveBeenCalledTimes(1);

		sdk.getMonitorDetails.mockResolvedValueOnce(monitor("a"));
		await details.retry();

		expect(details.status).toBe("ready");
		expect(details.monitor).toEqual(monitor("a"));
	});

	it("treats a rejection with no status as failed", async () => {
		sdk.getMonitorDetails.mockRejectedValue(new TypeError("Failed to fetch"));

		await details.load("a");

		expect(details.status).toBe("failed");
	});

	it("drops a slow response for a monitor that is no longer the current one", async () => {
		const slow = deferred<ReturnType<typeof monitor>>();
		sdk.getMonitorDetails.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(monitor("b"));

		const first = details.load("a");
		await details.load("b");
		slow.resolve(monitor("a"));
		await first;

		expect(details.monitor).toEqual(monitor("b"));
		expect(details.status).toBe("ready");
	});

	it("drops a slow failure for a monitor that is no longer the current one", async () => {
		const slow = deferred<ReturnType<typeof monitor>>();
		sdk.getMonitorDetails.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(monitor("b"));

		const first = details.load("a");
		await details.load("b");
		slow.reject(httpError(500));
		await first;

		expect(details.status).toBe("ready");
		expect(details.monitor).toEqual(monitor("b"));
	});

	it("refreshes the current monitor without leaving the ready state", async () => {
		sdk.getMonitorDetails.mockResolvedValueOnce(monitor("a", "4.9"));
		await details.load("a");
		const next = deferred<ReturnType<typeof monitor>>();
		sdk.getMonitorDetails.mockReturnValueOnce(next.promise);

		const refreshing = details.refresh();

		expect(details.status).toBe("ready");
		expect(details.monitor).toEqual(monitor("a", "4.9"));
		next.resolve(monitor("a", "5.3"));
		await refreshing;
		expect(details.monitor).toEqual(monitor("a", "5.3"));
	});

	it("keeps the data it has when a refresh fails", async () => {
		sdk.getMonitorDetails.mockResolvedValueOnce(monitor("a"));
		await details.load("a");
		sdk.getMonitorDetails.mockRejectedValueOnce(httpError(500));

		await details.refresh();

		expect(details.status).toBe("ready");
		expect(details.monitor).toEqual(monitor("a"));
		expect(logged).toHaveBeenCalledTimes(1);
	});

	it("does not refresh before a monitor has loaded", async () => {
		await details.refresh();
		expect(sdk.getMonitorDetails).not.toHaveBeenCalled();

		sdk.getMonitorDetails.mockRejectedValueOnce(httpError(404));
		await details.load("nope");
		sdk.getMonitorDetails.mockClear();
		await details.refresh();

		expect(sdk.getMonitorDetails).not.toHaveBeenCalled();
	});

	it("drops a refresh that finishes after another monitor was opened", async () => {
		sdk.getMonitorDetails.mockResolvedValueOnce(monitor("a"));
		await details.load("a");
		const slow = deferred<ReturnType<typeof monitor>>();
		sdk.getMonitorDetails.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(monitor("b"));

		const refreshing = details.refresh();
		await details.load("b");
		slow.resolve(monitor("a", "9.9"));
		await refreshing;

		expect(details.monitor).toEqual(monitor("b"));
	});
});
