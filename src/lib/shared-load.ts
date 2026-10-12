/**
 * Wraps a loader so overlapping calls share one run and a resolved run is reused, while a
 * rejected run is forgotten: the next call tries again.
 */
export function sharedLoad<T>(load: () => Promise<T>): () => Promise<T> {
	let pending: Promise<T> | null = null;

	return () => {
		pending ??= load().catch((error: unknown) => {
			pending = null;
			throw error;
		});
		return pending;
	};
}
