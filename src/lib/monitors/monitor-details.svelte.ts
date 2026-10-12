import { getMonitorDetails, type MonitorDetails } from "@sjvair/sdk";

export type MonitorDetailsStatus = "loading" | "ready" | "not-found" | "failed";

/**
 * One monitor, fetched by id. Unlike `monitorsManager.latest`, this does not depend on the
 * map's pollutant or on the monitor being active, so the detail panel can show any monitor.
 */
export class MonitorDetailsState {
	monitor: MonitorDetails | null = $state.raw(null);
	status: MonitorDetailsStatus = $state("loading");

	#id: string | null = null;
	// Bumped per request; a response for anything but the latest request is dropped.
	#request = 0;

	async load(id: string): Promise<void> {
		this.#id = id;
		const request = ++this.#request;
		this.monitor = null;
		this.status = "loading";

		try {
			const monitor = await getMonitorDetails(id);
			if (request !== this.#request) return;
			this.monitor = monitor;
			this.status = "ready";
		} catch (error) {
			if (request !== this.#request) return;
			if (isNotFound(error)) {
				this.status = "not-found";
				return;
			}
			console.error(error);
			this.status = "failed";
		}
	}

	/** Re-fetches the monitor already shown. A failure keeps the data on screen. */
	async refresh(): Promise<void> {
		if (this.status !== "ready" || this.#id === null) return;
		const request = ++this.#request;

		try {
			const monitor = await getMonitorDetails(this.#id);
			if (request !== this.#request) return;
			this.monitor = monitor;
		} catch (error) {
			if (request === this.#request) console.error(error);
		}
	}

	retry(): Promise<void> {
		return this.#id === null ? Promise.resolve() : this.load(this.#id);
	}
}

/**
 * The SDK rejects a failed request with `cause.result.status` set to the HTTP status, or,
 * when it could not parse the error body, with the `Response` itself as the cause.
 */
function isNotFound(error: unknown): boolean {
	const cause = (error as { cause?: { status?: unknown; result?: { status?: unknown } } } | null)
		?.cause;
	return cause?.result?.status === 404 || cause?.status === 404;
}
