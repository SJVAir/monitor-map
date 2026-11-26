import { describe, expect, it } from "vitest";
import { EV_ZIP_CODES, Mono, Tuolumne } from "../../src/lib/ev-stations/zip-codes";

describe("EV_ZIP_CODES", () => {
	it("has no duplicates", () => {
		expect(new Set(EV_ZIP_CODES).size).toBe(EV_ZIP_CODES.length);
	});

	it("includes a ZIP listed under several counties once", () => {
		expect(EV_ZIP_CODES.filter((zip) => zip === "93631")).toEqual(["93631"]);
	});

	it("is sorted", () => {
		expect([...EV_ZIP_CODES].sort()).toEqual(EV_ZIP_CODES);
	});

	it("drops ZIPs outside the counties", () => {
		for (const zip of ["94550", "95023", "09534"]) expect(EV_ZIP_CODES).not.toContain(zip);
	});
});

describe("county lists", () => {
	it("files Lee Vining (93541) under Mono, not Tuolumne", () => {
		expect(Tuolumne).not.toContain("93541");
		expect(Mono).toContain("93541");
	});
});
