// NOTE: This can probably be deleted
export class LoadingQueue {
	queue: Array<symbol> = $state([]);
	loading: boolean = $derived(this.queue.length > 0);

	add(id: symbol) {
		this.queue.push(id);
	}

	remove(id: symbol) {
		const idx = this.queue.indexOf(id);
		this.queue.splice(idx, 1);
	}
}

export function TriggerLoadingScreen<T extends (this: C, ...args: any[]) => any, C>(
	originalMethod: T,
	_context: ClassMethodDecoratorContext<C, T>
): (this: C, ...args: Parameters<T>) => ReturnType<T> {
	const queue = new LoadingQueue();
	const id = Symbol();

	const replacementMethod: (this: C, ...args: Parameters<T>) => ReturnType<T> = function (
		this: C,
		...args: Parameters<T>
	): ReturnType<T> {
		queue.add(id);
		const result = originalMethod.call(this, ...args);
		if (result instanceof Promise) {
			return result.finally(() => queue.remove(id)) as ReturnType<T>;
		} else {
			queue.remove(id);
			return result;
		}
	};
	return replacementMethod;
}
