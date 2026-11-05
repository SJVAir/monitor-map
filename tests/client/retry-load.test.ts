import { describe, expect, it, vi } from "vitest";
import { retryMonitorsLoad } from "$lib/monitors/retry-load.js";

describe("retryMonitorsLoad", () => {
	it("calls the store's status.retry() when the load failed", () => {
		const retry = vi.fn();
		const fallback = vi.fn();
		retryMonitorsLoad(
			{ dataSource: { status: { state: "error", error: new Error("x"), retry } } },
			fallback
		);
		expect(retry).toHaveBeenCalledOnce();
		expect(fallback).not.toHaveBeenCalled();
	});

	it("falls back to init() when there is no error to retry", () => {
		const fallback = vi.fn();
		retryMonitorsLoad({ dataSource: { status: { state: "loading" } } }, fallback);
		expect(fallback).toHaveBeenCalledOnce();
	});
});
