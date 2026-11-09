import { afterEach, describe, expect, it } from "vitest";
import { currentUser, isAuthenticated, monitorMapUserChanged } from "$lib/user.svelte.js";

const g = globalThis as unknown as Record<string, unknown>;

afterEach(() => {
	delete g["USER"];
	monitorMapUserChanged();
});

describe("currentUser", () => {
	it("is undefined with no USER", () => {
		expect(currentUser()).toBeUndefined();
	});

	it("is undefined with a null USER", () => {
		g["USER"] = null;
		expect(currentUser()).toBeUndefined();
	});

	it("is the global USER object", () => {
		const user = { is_authenticated: true };
		g["USER"] = user;
		expect(currentUser()).toBe(user);
	});
});

describe("isAuthenticated", () => {
	it("is false with no USER", () => {
		expect(isAuthenticated()).toBe(false);
	});

	it("is false when is_authenticated is false", () => {
		g["USER"] = { is_authenticated: false };
		expect(isAuthenticated()).toBe(false);
	});

	it("is true when is_authenticated is true", () => {
		g["USER"] = { is_authenticated: true };
		expect(isAuthenticated()).toBe(true);
	});

	it("reads a replaced USER after monitorMapUserChanged()", () => {
		g["USER"] = { is_authenticated: true };
		expect(isAuthenticated()).toBe(true);
		g["USER"] = { is_authenticated: false };
		monitorMapUserChanged();
		expect(isAuthenticated()).toBe(false);
	});
});
