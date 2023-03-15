type PromiseExecutor<T> = (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void;

export function asyncInitializer<T>(cb: PromiseExecutor<T>): () => Promise<T> {
  let loaded: Promise<T>;

  return async function() {
    if (loaded === undefined) {
      loaded = new Promise<T>(cb);
    }
    return loaded;
  }
}
