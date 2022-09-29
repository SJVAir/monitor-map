import { WorkerServiceTask } from "./WorkerServiceTask";
import type { WorkerServiceResponse } from "./WorkerServiceResponse";
import type { IWorkerServiceModule } from "../types";

type WorkerServiceResolver<T extends IWorkerServiceModule> = <K extends keyof T>(value: Awaited<ReturnType<T[K]>>) => void;

interface IWorkerServiceResponder<T extends IWorkerServiceModule> {
  resolve: WorkerServiceResolver<T>;
  reject: (reason?: any) => void;
}

export class WorkerServiceClient<T extends IWorkerServiceModule> {
  private globalTaskID = 0
  private responders: Map<number, IWorkerServiceResponder<T>> = new Map();
  private worker: Worker;

  constructor(w: Worker) {
    this.worker = w;

    this.worker.onmessageerror = (ev: MessageEvent<any>) => console.error("worker failed: ", ev);

    this.worker.onmessage = (msg: MessageEvent<WorkerServiceResponse<T>>) => {
      const { id, error, payload, success } = msg.data;
      const responder = this.responders.get(id)!;

      if (success) {
        responder.resolve(payload as Awaited<ReturnType<T[keyof T]>>);

      } else if (error) {
        responder.reject(payload);

      } else {
        console.error(`Unknown response from background service "${this.constructor.name}"`, msg)
      }
      
      // purge responders
      this.responders.delete(id);
    }
  }

  public run<K extends keyof T>(taskName: K, ...parameters: Parameters<T[K]>): Promise<Awaited<ReturnType<T[K]>>> {
    const task = new WorkerServiceTask<T>(++this.globalTaskID, taskName, JSON.parse(JSON.stringify(parameters)));

    return new Promise<Awaited<ReturnType<T[K]>>>( (resolve, reject) => {
      this.responders.set(task.id, { resolve, reject });
      this.worker.postMessage(task);
    });
  }
}
