import { describe, expect, it } from "vitest";
import { anySignal, untilAborted } from "../src/lib/abort";

describe("anySignal", () => {
	it("aborts with the reason of the input that aborts", () => {
		const a = new AbortController();
		const b = new AbortController();
		const { signal } = anySignal(a.signal, b.signal);
		expect(signal.aborted).toBe(false);
		b.abort("second");
		expect(signal.aborted).toBe(true);
		expect(signal.reason).toBe("second");
	});

	it("is already aborted when an input is", () => {
		const a = new AbortController();
		a.abort("early");
		const { signal } = anySignal(new AbortController().signal, a.signal);
		expect(signal.aborted).toBe(true);
		expect(signal.reason).toBe("early");
	});

	it("ignores undefined inputs", () => {
		const { signal } = anySignal(undefined);
		expect(signal.aborted).toBe(false);
	});

	it("stops following inputs after dispose", () => {
		const a = new AbortController();
		const { signal, dispose } = anySignal(a.signal);
		dispose();
		a.abort();
		expect(signal.aborted).toBe(false);
	});
});

describe("untilAborted", () => {
	it("resolves with the value when there is no signal", async () => {
		await expect(untilAborted(Promise.resolve(5), undefined)).resolves.toBe(5);
	});

	it("rejects with the reason when the signal aborts first", async () => {
		const c = new AbortController();
		const p = untilAborted(new Promise((resolve) => setTimeout(() => resolve(1), 10)), c.signal);
		c.abort("stop");
		await expect(p).rejects.toBe("stop");
	});

	it("rejects immediately with an already-aborted signal", async () => {
		const c = new AbortController();
		c.abort("done");
		await expect(untilAborted(Promise.resolve(1), c.signal)).rejects.toBe("done");
	});

	it("does not leak an unhandled rejection from the inner promise", async () => {
		const c = new AbortController();
		let reject!: (e: unknown) => void;
		const inner = new Promise<number>((_, r) => (reject = r));
		const p = untilAborted(inner, c.signal);
		c.abort("stop");
		await expect(p).rejects.toBe("stop");
		reject(new Error("late"));
		await new Promise((r) => setTimeout(r, 10));
	});
});
