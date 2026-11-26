import { page } from "vitest/browser";

/**
 * Moves the real mouse to the viewport's bottom-right corner, away from the toolbars (top-left).
 * The pointer stays where a test's last click left it, and Chromium reports it entering whatever
 * is drawn there later (the next test's toolbar, or a trigger that slides under it), which opens
 * that dropdown on hover.
 */
export async function parkPointer(): Promise<void> {
	const spot = document.createElement("div");
	spot.style.cssText = "position: fixed; right: 0; bottom: 0; width: 4px; height: 4px";
	document.body.append(spot);
	try {
		await page.elementLocator(spot).hover();
	} finally {
		spot.remove();
	}
}
