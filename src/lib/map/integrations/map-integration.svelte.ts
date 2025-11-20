import { XMap } from "@tstk/builtin-extensions";

export abstract class MapIntegration {
  static instances: XMap<Function, MapIntegration> = new XMap();

  abstract referenceId: string;
  abstract enabled: boolean;

  constructor() {
    if (MapIntegration.instances.has(this.constructor)) {
      console.log("instance found for:", this);
      return MapIntegration.instances.get(this.constructor);
    }

    console.log("setting instance:", this);
    MapIntegration.instances.set(this.constructor, this);

    //$effect(() => {
    //  if (MapIntegration.mapCtrl.map) {
    //    if (this.enabled) {
    //      this.apply();
    //    } else if (this.remove) {
    //      this.remove();
    //    }
    //  }
    //});
  }

  abstract apply(): void;

  remove?(): void;
}
