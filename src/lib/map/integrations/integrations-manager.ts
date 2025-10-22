import { XMap } from "@tstk/builtin-extensions";
import { Singleton } from "@tstk/decorators";
import type { SomeMapIntegration } from "./types";

@Singleton
export class IntegrationsManager {
  private integrations: XMap<string, SomeMapIntegration> = new XMap();

  register(...integrations: Array<SomeMapIntegration>): void {
    for (const integration of integrations) {
      this.integrations.set(integration.referenceId, integration);
    }
  }

  refresh(): void {
    for (const integration of this.integrations.values()) {
      integration.apply();
    }
  }
}
