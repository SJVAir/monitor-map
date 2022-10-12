import type { WorkerServiceTask } from "./WorkerServiceTask";
import type { IWorkerServiceModule } from "../types";

export class WorkerServiceResponse<T> {
  id: number;
  error: unknown;
  success!: boolean;
  payload!: T;

  constructor(taskId: number) {
    this.id = taskId;
  }

  pass(payload: T) {
    this.success = true;
    this.payload =  payload;
  }

  fail(error: unknown) {
    this.success = false;
    this.error = error;
  }
}

export class WorkerService<T extends IWorkerServiceModule> {
  serviceModule: T;
  serviceModuleName: string;

  constructor(name: string, serviceModule: T) {
    this.serviceModule = serviceModule;
    this.serviceModuleName = name;

    self.addEventListener("message", async (e: MessageEvent<WorkerServiceTask<T>>) => {
      const { id, taskName, parameters } = e.data;
      const serviceCall = this.serviceModule[taskName];
      const response = new WorkerServiceResponse<ReturnType<typeof serviceCall>>(id);

      if (taskName in this.serviceModule) {
        await this.serviceModule[taskName](...parameters)
          .then((payload: ReturnType<typeof serviceCall>) => response.pass(payload))
          .catch((err: any) => response.fail(err.message));

      } else {
        response.fail(`Background task "${ String(taskName) }" not found in "${ this.serviceModuleName }" controller`);
      }
      self.postMessage(response);
    });
  }
}
