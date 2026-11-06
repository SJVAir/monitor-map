import type { monitorsStore } from "$lib/stores.svelte.js";

/**
 * Retries a failed initial monitors load through the store's own `status.retry()`, which repeats
 * the failed `init()` call. When the status is not an error (nothing to retry), runs `fallback`.
 */
export function retryMonitorsLoad(
	store: { dataSource: Pick<typeof monitorsStore.dataSource, "status"> },
	fallback: () => void
) {
	const { status } = store.dataSource;
	if (status.state === "error") status.retry();
	else fallback();
}
