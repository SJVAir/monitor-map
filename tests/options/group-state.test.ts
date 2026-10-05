import { describe, expect, it } from "vitest";
import { groupState, setGroup } from "$lib/options/group-state";

describe("groupState", () => {
	it("is checked when every row is on", () => {
		expect(groupState([true, true])).toBe("checked");
	});

	it("is unchecked when every row is off", () => {
		expect(groupState([false, false])).toBe("unchecked");
	});

	it("is indeterminate when some rows are on", () => {
		expect(groupState([true, false, true])).toBe("indeterminate");
	});

	it("is empty when the group has no visible rows", () => {
		expect(groupState([])).toBe("empty");
	});
});

describe("setGroup", () => {
	it("sets only the options it is given", () => {
		const visible = [{ value: false }, { value: true }];
		const hidden = { value: false };
		setGroup(visible, true);
		expect(visible.map((o) => o.value)).toEqual([true, true]);
		expect(hidden.value).toBe(false);
	});
});
