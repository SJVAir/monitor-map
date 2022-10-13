import { createApp } from "vue";
import AppVue from "./App.vue";
import { RouterModule } from "../modules/Router";
import "../styles.scss";

const defaultMountpointId: string = "SJVAirMonitorMap" as const;

export function initialize(mountpointId?: string): void {
  const targetID = mountpointId || defaultMountpointId;
  const mountPoint = document.getElementById(targetID);

  if (!mountPoint) {
    throw new Error(`Unable to find mount point with id "${ mountPoint }"`);
  }

  const app = createApp(AppVue);
  app.use(RouterModule);
  app.mount(mountPoint);
};
