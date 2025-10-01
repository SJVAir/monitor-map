export function ThrowIfUnset<V, T = unknown>(
  _target: ClassAccessorDecoratorTarget<T, V>,
  ctx: ClassAccessorDecoratorContext,
): ClassAccessorDecoratorResult<T, V> {
  let cached: V;

  return {
    get() {
      if (cached === undefined) {
        throw new Error(`"${ctx.name.toString()}" is not initialized. Call init() first.`);
      }
      return cached;
    },
    set(newValue) {
      cached = newValue;
    },
    init(defaultValue?: V) {
      if (defaultValue !== undefined) {
        cached = defaultValue;
      }
      return cached;
    }
  };
};
