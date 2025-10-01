import { Singleton } from "@tstk/decorators";
import { type MonitorsMeta } from "@sjvair/sdk";

export function _ThrowIfUnset<V, T = unknown>(thing: V) {
  console.log("thing", thing);
  let cached: V;

  return function (
    _target: ClassAccessorDecoratorTarget<T, V>,
    ctx: ClassAccessorDecoratorContext,
  ): ClassAccessorDecoratorResult<T, V> {
    console.log("target", _target);
    console.log("ctx", ctx)
    return {
      get() {
        console.log(`Getting value for property "${ctx.name.toString()}"`);
        if (cached === undefined) {
          throw new Error(`${ctx.name.toString()} is not initialized. Call init() first.`);
        }

        return cached;
      },
      set(newValue) {
        console.log(`Setting new value for property "${ctx.name.toString()}" to "${newValue}"`);
        cached = newValue;
      },
    };
  };
}

function ThrowIfUnset<V, T = unknown>(
  _target: ClassAccessorDecoratorTarget<T, V>,
  ctx: ClassAccessorDecoratorContext,
): ClassAccessorDecoratorResult<T, V> {
  console.log("target", _target);
  console.log("ctx", ctx)
  let cached: V;
  return {
    get() {
      console.log(`Getting value for property "${ctx.name.toString()}"`);
      if (cached === undefined) {
        throw new Error(`${ctx.name.toString()} is not initialized. Call init() first.`);
      }

      return cached;
    },
    set(newValue) {
      console.log(`Setting new value for property "${ctx.name.toString()}" to "${newValue}"`);
      cached = newValue;
    },
  };
};

@Singleton
export class MonitorsController {
  meta!: string;

  @ThrowIfUnset
  accessor otherThing: any;
}
