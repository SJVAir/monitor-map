import { getContext, setContext } from "svelte";
import { SvelteSet } from "svelte/reactivity";
import { isWideLayout } from "./layout";

const OPTIONS_MENUS_KEY = Symbol("monitor-map-options-menus");

/** Which menus are opened by click: at most one on the toolbar, any number in the panel. */
export class OptionsMenusState {
	private open = new SvelteSet<string>();

	isOpen(id: string): boolean {
		return this.open.has(id);
	}

	toggle(id: string): void {
		if (this.open.has(id)) {
			this.open.delete(id);
			return;
		}
		if (isWideLayout()) this.open.clear();
		this.open.add(id);
	}

	/** Hovering another toolbar trigger closes any dropdown left open by a click. */
	closeOthers(id: string): void {
		for (const other of [...this.open]) {
			if (other !== id) this.open.delete(other);
		}
	}

	close(id: string): void {
		this.open.delete(id);
	}

	closeAll(): void {
		this.open.clear();
	}
}

export function provideOptionsMenus(): OptionsMenusState {
	return setContext(OPTIONS_MENUS_KEY, new OptionsMenusState());
}

export function useOptionsMenus(): OptionsMenusState {
	const menus = getContext<OptionsMenusState | undefined>(OPTIONS_MENUS_KEY);
	if (!menus) throw new Error("OptionsMenu must be rendered inside OptionsBar");
	return menus;
}
