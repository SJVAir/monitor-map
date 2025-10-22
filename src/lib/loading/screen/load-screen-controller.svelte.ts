import { Singleton } from "@tstk/decorators";

@Singleton
export class LoadingScreenController {
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
