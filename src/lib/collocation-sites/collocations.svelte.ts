import { getCollocationSites, type CollocationSite } from "@sjvair/sdk";

class CollocationSitesManager {
	initialized: boolean = $state(false);

	collocationSites: Array<CollocationSite> | null = $state(null);

	async init(): Promise<void> {
		if (this.initialized) return;

		this.collocationSites = await getCollocationSites();

		this.initialized = true;
	}

	async update(): Promise<void> {
		if (!this.initialized) return;

		this.collocationSites = await getCollocationSites();
	}
}

export const collocationSitesManager = new CollocationSitesManager();
export type { CollocationSitesManager };
