/** Color stops for a chart: each level's lower bound and its hex color without the `#`. */
export type LevelColors = Array<[number, string]>;

// `range` is loose on purpose: the SDK types it as a tuple with an open tail, and only its
// first member (the level's lower bound) is read.
export function levelColors(
	levels: ReadonlyArray<{
		range: readonly [number, ...unknown[]] | readonly number[];
		color: string;
	}>
): LevelColors {
	return levels.map((level) => [level.range[0], level.color.replace(/^#/, "")]);
}
