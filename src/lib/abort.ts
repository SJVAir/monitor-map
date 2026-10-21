export type SignalOptions = { signal?: AbortSignal };

/**
 * A signal that aborts as soon as any input does, with that input's reason. Already aborted if
 * any input is. Undefined inputs are ignored. Call `dispose()` to drop the listeners.
 */
export function anySignal(...signals: Array<AbortSignal | undefined>): {
	signal: AbortSignal;
	dispose(): void;
} {
	const controller = new AbortController();
	const cleanups: Array<() => void> = [];
	const dispose = () => {
		for (const cleanup of cleanups.splice(0)) cleanup();
	};

	for (const input of signals) {
		if (!input) continue;
		if (input.aborted) {
			controller.abort(input.reason);
			dispose();
			break;
		}
		const onAbort = () => {
			controller.abort(input.reason);
			dispose();
		};
		input.addEventListener("abort", onAbort, { once: true });
		cleanups.push(() => input.removeEventListener("abort", onAbort));
	}

	return { signal: controller.signal, dispose };
}

/**
 * Settles like `promise`, unless `signal` aborts first, in which case it rejects with
 * `signal.reason`. The inner promise's later outcome is swallowed.
 */
export function untilAborted<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
	if (!signal) return promise;
	if (signal.aborted) {
		promise.catch(() => {});
		return Promise.reject(signal.reason);
	}
	return new Promise<T>((resolve, reject) => {
		const onAbort = () => reject(signal.reason);
		signal.addEventListener("abort", onAbort, { once: true });
		promise.then(
			(value) => {
				signal.removeEventListener("abort", onAbort);
				resolve(value);
			},
			(error) => {
				signal.removeEventListener("abort", onAbort);
				reject(error);
			}
		);
	});
}
