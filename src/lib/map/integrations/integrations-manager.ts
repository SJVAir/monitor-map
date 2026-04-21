import { XMap } from "@tstk/builtin-extensions";
import type { SomeMapIntegration } from "./types";

class IntegrationsManager {
	private integrations: XMap<string, SomeMapIntegration> = new XMap();

	register(...integrations: Array<SomeMapIntegration>): void {
		for (const integration of integrations) {
			this.integrations.set(integration.referenceId, integration);
		}
	}

	refresh(): void {
		for (const integration of this.integrations.values()) {
			if (integration.enabled) {
				integration.apply();
			} else if (integration.remove) {
				integration.remove();
			}
		}
	}
}

export const integrationsManager = new IntegrationsManager();
export type { IntegrationsManager };
