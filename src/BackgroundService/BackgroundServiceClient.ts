import { BackgroundTask } from "./BackgroundTask";
import type { BackgroundTaskResponse } from "./BackgroundTaskResponse";
import type { IBackgroundService } from "../types";

type BackgroundTaskResolver<T extends IBackgroundService> = <K extends keyof T>(value: Awaited<ReturnType<T[K]>>) => void;

interface IBackgroundTaskResponder<T extends IBackgroundService> {
  resolve: BackgroundTaskResolver<T>;
  reject: (reason?: any) => void;
}

export class BackgroundServiceClient<T extends IBackgroundService> {
  private globalTaskID = 0
  private responders: Map<number, IBackgroundTaskResponder<T>> = new Map();
  private worker: Worker;

  constructor(w: Worker) {
    this.worker = w;

    this.worker.onmessageerror = (ev: MessageEvent<any>) => console.error("worker failed: ", ev);

    this.worker.onmessage = (msg: MessageEvent<BackgroundTaskResponse<T>>) => {
      const { id, error, payload, success } = msg.data;
      const responder = this.responders.get(id)!;

      if (success) {
        responder.resolve(payload as Awaited<ReturnType<T[keyof T]>>);

      } else if (error) {
        responder.reject(payload);

      } else {
        console.error(`Unknown response from background service "${this.constructor.name}"`)
      }
      
      // purge responders
      this.responders.delete(id);
    }
  }

  run<K extends keyof T>(taskName: K, ...parameters: Parameters<T[K]>): Promise<Awaited<ReturnType<T[K]>>> {
    const task = new BackgroundTask<T>(++this.globalTaskID, taskName, JSON.parse(JSON.stringify(parameters)));

    return new Promise<Awaited<ReturnType<T[K]>>>( (resolve, reject) => {
      this.responders.set(task.id, { resolve, reject });
      this.worker.postMessage(task);
    });
  }
}
