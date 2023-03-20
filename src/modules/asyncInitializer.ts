type PromiseExecutor<T> = (resolve: (value: T | PromiseLike<T>) => void) => Promise<void>;

export function asyncInitializer<T>(cb: PromiseExecutor<T>): () => Promise<T> {
  let loaded: Promise<T>;

  return async function() {
    if (loaded === undefined) {
      loaded = new Promise<T>((resolve, reject) => {
        (async () => {
          try {
            await cb(resolve);
          } catch(error) {
            reject(error);
          }
        })();
      });
    }
    return loaded;
  }
}
