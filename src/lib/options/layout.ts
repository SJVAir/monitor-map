/**
 * Tailwind's default `md` breakpoint (48rem). Layout itself is pure CSS (`md:` / `max-md:`);
 * this is only read at event time for the few behaviors that differ between the toolbar and
 * the options panel.
 */
export const WIDE_LAYOUT_QUERY = "(min-width: 48rem)";

export function isWideLayout(): boolean {
	return window.matchMedia(WIDE_LAYOUT_QUERY).matches;
}
