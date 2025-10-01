export function Initializer<
  T extends (this: C, ...args: any[]) => any,
  C
>(
  originalMethod: T,
  _context: ClassMethodDecoratorContext<C, T>
): (this: C, ...args: Parameters<T>) => ReturnType<T> {
  let initialized = false;

  const replacementMethod: (this: C, ...args: Parameters<T>) => ReturnType<T> = function (this: C, ...args: Parameters<T>): ReturnType<T> {
    if (!initialized) {
      const result = originalMethod.call(this, ...args);
      if (result instanceof Promise) {
        return result.finally(() => { initialized = true; }) as ReturnType<T>;
      } else {
        initialized = true;
        return result;
      }
    } else {
      return undefined as ReturnType<T>;
    }
  };
  return replacementMethod;
}

