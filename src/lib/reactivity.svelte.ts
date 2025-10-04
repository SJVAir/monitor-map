class ReactiveState<T> {
  private internalValue?: T = $state();

  constructor(initialValue?: T) {
    this.internalValue = initialValue;
  }
  get value(): T | undefined {
    return this.internalValue;
  }

  set value(newValue: T) {
    // Perform any validation or side effects here
    this.internalValue = newValue; // Update the reactive state
  }
}

class ShallowReactiveState<T> {
  private internalValue?: T = $state.raw();

  constructor(initialValue?: T) {
    this.internalValue = initialValue;
  }
  get value(): T | undefined {
    return this.internalValue;
  }

  set value(newValue: T) {
    // Perform any validation or side effects here
    this.internalValue = newValue; // Update the reactive state
  }
}


class DerivedReactiveState<T> {
  private internalValue?: T;

  constructor(expression: () => T) {
    this.internalValue = $derived.by(expression);
  }
  get value(): T | undefined {
    return this.internalValue;
  }
  set value(newValue: T) {
    this.internalValue = newValue;
  }
}

export function Derived<V>(value: () => V) {
  let ref: DerivedReactiveState<V> = new DerivedReactiveState<V>(value);
  return function <V, T = unknown>(
    _target: ClassAccessorDecoratorTarget<T, V>,
    _ctx: ClassAccessorDecoratorContext,
  ): ClassAccessorDecoratorResult<T, V> {

    return {
      get() {
        return ref.value as V;
      },
    };
  }
}
export function Reactive(shallow?: boolean) {
  return function <V, T = unknown>(
    _target: ClassAccessorDecoratorTarget<T, V>,
    _ctx: ClassAccessorDecoratorContext,
  ): ClassAccessorDecoratorResult<T, V> {
    let ref = shallow ? new ShallowReactiveState<V>() : new ReactiveState<V>();

    return {
      get(): V {
        return ref.value as V;
      },
      set(newValue): void {
        ref.value = newValue;
      },
    };
  };
}
