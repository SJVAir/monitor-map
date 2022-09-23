import { BackgroundTask } from "./BackgroundTask";
import { BackgroundTaskResponse } from "./BackgroundTaskResponse";
import type { IBackgroundService } from "../types";

export class BackgroundService<T extends IBackgroundService> {
  serviceModule: T;
  serviceModuleName: string;

  constructor(name: string, serviceModule: T) {
    this.serviceModule = serviceModule;
    this.serviceModuleName = name;

    self.addEventListener("message", async (e: MessageEvent<BackgroundTask<T>>) => {
      const { id, taskName, parameters } = e.data;
      const response = new BackgroundTaskResponse(id);

      if (taskName in this.serviceModule) {
        await this.serviceModule[taskName](...parameters)
          .then(response.pass)
          .catch(response.fail);

      } else {
        response.fail(`Background task "${ String(taskName) }" not found in "${ this.serviceModuleName }" controller`);
      }
      self.postMessage(response);
    });
  }
}
