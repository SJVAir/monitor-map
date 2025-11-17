import type { Map as MaptilerMap } from "@maptiler/sdk";
import { MapController } from "../map.svelte.ts";

export abstract class MapIntegration {
  static mapCtrl: MapController = new MapController();

  abstract referenceId: string;
  abstract enabled: boolean;

  //constructor() {
  //  $effect(() => {
  //    if (MapIntegration.mapCtrl.map) {
  //      if (this.enabled) {
  //        this.apply();
  //      } else if (this.remove) {
  //        this.remove();
  //      }
  //    }
  //  });
  //}

  abstract apply(): void;

  remove?(): void;
}
