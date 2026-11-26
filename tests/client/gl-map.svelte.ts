import type { MapContext } from "@sjvair/map-sdk";

/** A MapContext with only a reactive `gl`, which `replace` swaps as a style rebuild does. */
export function glMap(first: object | null) {
	let gl = $state.raw<object | null>(first);
	const map = {
		get gl() {
			return gl;
		}
	} as unknown as MapContext;
	return {
		map,
		replace(next: object | null) {
			gl = next;
		}
	};
}
