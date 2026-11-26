/** A box's edges, in px from the map container's top left. */
export interface Edges {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

/**
 * The anchor of a station popup whose station is at `y` in the free area `bounds`: "top" (the
 * popup opens below the station) in its upper half, else "bottom" (above). The popup is always
 * centred on the station; `shiftInto` brings it into view sideways.
 */
export function popupAnchor(y: number, bounds: Edges): "top" | "bottom" {
	return y - bounds.top <= bounds.bottom - y ? "top" : "bottom";
}

/** The shift along one axis that brings [start, end] inside [min, max]; the start wins. */
function axisShift(start: number, end: number, min: number, max: number): number {
	if (start < min || end - start > max - min) return min - start;
	if (end > max) return max - end;
	return 0;
}

/**
 * How far `box` must move, [dx, dy] in px, to lie inside `bounds`. A box bigger than `bounds`
 * keeps its top or left edge in view.
 */
export function shiftInto(box: Edges, bounds: Edges): [number, number] {
	return [
		axisShift(box.left, box.right, bounds.left, bounds.right),
		axisShift(box.top, box.bottom, bounds.top, bounds.bottom)
	];
}
