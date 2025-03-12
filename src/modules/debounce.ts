export function debounce<T>(fn: (args: T) => void | Promise<void>, ms: number) {
  let timeoutId = 0;

  return function (args: T) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(args);
    }, ms) as unknown as number; // Adjust the delay as needed (in milliseconds)
  }
}
