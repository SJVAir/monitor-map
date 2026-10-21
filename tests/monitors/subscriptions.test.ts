import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getApiToken, loadSubscriptionLevel } from "$lib/monitors/subscriptions.js";

const account = vi.hoisted(() => ({ getSubscriptions: vi.fn() }));
vi.mock("@sjvair/sdk/account", () => account);

const g = globalThis as unknown as Record<string, unknown>;

beforeEach(() => {
	account.getSubscriptions.mockReset();
});

afterEach(() => {
	delete g["USER"];
});

describe("getApiToken", () => {
	it("is undefined with no USER", () => {
		expect(getApiToken()).toBeUndefined();
	});

	it("is undefined with an empty api_token", () => {
		g["USER"] = { api_token: "" };
		expect(getApiToken()).toBeUndefined();
	});

	it("is undefined with no api_token", () => {
		g["USER"] = {};
		expect(getApiToken()).toBeUndefined();
	});

	it("returns the api_token", () => {
		g["USER"] = { api_token: "abc" };
		expect(getApiToken()).toBe("abc");
	});
});

describe("loadSubscriptionLevel", () => {
	it("passes the token and signal, and returns the matching level", async () => {
		const { signal } = new AbortController();
		account.getSubscriptions.mockResolvedValue([
			{ monitor: "m0", level: "hazardous" },
			{ monitor: "m1", level: "unhealthy" }
		]);
		await expect(loadSubscriptionLevel("m1", { signal })).resolves.toBe("unhealthy");
		expect(account.getSubscriptions).toHaveBeenCalledWith(undefined, { signal });
	});

	it("returns null when no subscription matches", async () => {
		account.getSubscriptions.mockResolvedValue([{ monitor: "m0", level: "hazardous" }]);
		await expect(loadSubscriptionLevel("m1")).resolves.toBeNull();
	});
});
