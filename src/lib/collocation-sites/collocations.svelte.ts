import { getCollocationSites, type CollocationSite } from "@sjvair/sdk";
import type { SignalOptions } from "$lib/abort";

class CollocationSitesManager {
	initialized: boolean = $state(false);

	collocationSites: Array<CollocationSite> | null = $state(null);

	async init({ signal }: SignalOptions = {}): Promise<void> {
		if (this.initialized) return;
		if (signal?.aborted) throw signal.reason;

		this.collocationSites = await getCollocationSites({ signal });

		this.initialized = true;
	}

	async update({ signal }: SignalOptions = {}): Promise<void> {
		if (!this.initialized) return;
		if (signal?.aborted) throw signal.reason;

		this.collocationSites = await getCollocationSites({ signal });
	}
}

export const collocationSitesManager = new CollocationSitesManager();
export type { CollocationSitesManager };
