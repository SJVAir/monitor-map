import { IBackgroundService } from "../types";

export class BackgroundTaskResponse<T> {
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
    Object.freeze(this);
  }

  fail(error: unknown) {
    this.success = false;
    this.error = error;
    Object.freeze(this);
  }
}
