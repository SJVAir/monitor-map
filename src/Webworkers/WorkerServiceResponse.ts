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
