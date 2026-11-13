/**
 * Tailwind's default `md` breakpoint (48rem): the page layout's switch between the side panel
 * (wide) and the panel taking the bottom half of the map (narrow). Layout itself is pure CSS
 * (`md:` / `max-md:`); this is only read at event time, for behavior that follows that layout.
 */
export const WIDE_LAYOUT_QUERY = "(min-width: 48rem)";

export function isWideLayout(): boolean {
	return window.matchMedia(WIDE_LAYOUT_QUERY).matches;
}
