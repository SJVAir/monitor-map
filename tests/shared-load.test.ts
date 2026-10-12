import { describe, expect, it, vi } from "vitest";
import { sharedLoad } from "$lib/shared-load";

describe("sharedLoad", () => {
	it("shares one run between overlapping calls", async () => {
		const load = vi.fn().mockResolvedValue("chunk");
		const shared = sharedLoad(load);

		const first = shared();
		const second = shared();

		expect(second).toBe(first);
		await expect(first).resolves.toBe("chunk");
		expect(load).toHaveBeenCalledTimes(1);
	});

	it("reuses a run that resolved", async () => {
		const load = vi.fn().mockResolvedValue("chunk");
		const shared = sharedLoad(load);

		await shared();
		await expect(shared()).resolves.toBe("chunk");

		expect(load).toHaveBeenCalledTimes(1);
	});

	it("tries again after a run that rejected", async () => {
		const load = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue("chunk");
		const shared = sharedLoad(load);

		await expect(shared()).rejects.toThrow("offline");
		await expect(shared()).resolves.toBe("chunk");

		expect(load).toHaveBeenCalledTimes(2);
	});

	it("rejects every overlapping caller of a failed run", async () => {
		const shared = sharedLoad(vi.fn().mockRejectedValue(new Error("offline")));

		const results = await Promise.allSettled([shared(), shared()]);

		expect(results.map((result) => result.status)).toEqual(["rejected", "rejected"]);
	});
});
