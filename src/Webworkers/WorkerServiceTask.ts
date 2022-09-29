import type { IWorkerServiceModule } from "../types";

export class WorkerServiceTask<T extends IWorkerServiceModule> {
  id: number;
  parameters: Parameters<T[keyof T]>;
  taskName: keyof T;

  constructor(id: number, taskName: keyof T, parameters: Parameters<T[keyof T]>) {
    this.id = id;
    this.parameters = parameters;
    this.taskName = taskName;
  }
}
