import { Singleton } from "@tstk/decorators";

@Singleton
export class LoadingScreen {
  enabled: boolean = $state(true);

  enable() {
    if (!this.enabled) {
      this.enabled = true;
    }
  }

  disable() {
    if (this.enabled) {
      this.enabled = false;
    }
  }
}
