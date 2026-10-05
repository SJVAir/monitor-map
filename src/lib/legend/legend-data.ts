import type { SJVAirEntryLevel } from "@sjvair/sdk";
import { mix } from "color2k";
import type { MonitorsPollutant } from "$lib/monitors/types";

export interface LegendCategory {
	color: string;
	label?: string;
}

export type LegendBarData =
	| { kind: "gradient"; colors: Array<string>; ticks: Array<string> }
	| { kind: "blocks"; categories: Array<LegendCategory>; breakpoints?: Array<string> };

export interface LegendSection {
	id: string;
	title: string;
	unit?: string;
	bar: LegendBarData;
}

export interface SmokeDensityStyle {
	label: string;
	color: string;
	opacity: number;
}

const POLLUTANT_TITLES: Record<MonitorsPollutant, { title: string; unit: string }> = {
	pm25: { title: "PM2.5", unit: "µg/m³" },
	o3: { title: "Ozone", unit: "ppb" }
};

/**
 * Pollutant legend built from the monitors meta levels — the same levels the map markers are
 * colored by, so the two can never disagree. One tick per level, at that level's color stop.
 */
export function pollutantLegendSection(
	pollutant: MonitorsPollutant,
	levels: ReadonlyArray<Pick<SJVAirEntryLevel, "color" | "range">>
): LegendSection | null {
	if (levels.length === 0) return null;
	return {
		id: "pollutant",
		...POLLUTANT_TITLES[pollutant],
		bar: {
			kind: "gradient",
			colors: levels.map((level) => level.color),
			ticks: levels.map((level) => String(Math.floor(level.range[0])))
		}
	};
}

/** Fire & Smoke share one toggle, so they render as two independent bars. */
export function fireSmokeLegendSections(
	fireTiers: ReadonlyArray<LegendCategory>,
	smoke: ReadonlyArray<SmokeDensityStyle>
): Array<LegendSection> {
	return [
		{ id: "fire", title: "Fire", unit: "MW", bar: { kind: "blocks", categories: [...fireTiers] } },
		{
			id: "smoke",
			title: "Smoke Density",
			bar: {
				kind: "blocks",
				categories: smoke.map(({ label, color, opacity }) => ({
					label,
					color: swatchOverWhite(color, opacity)
				}))
			}
		}
	];
}

/** Approximates how a translucent fill layer looks over a light basemap. */
export function swatchOverWhite(color: string, opacity: number): string {
	return mix("#ffffff", color, opacity);
}

export function gradientBackground(colors: ReadonlyArray<string>): string {
	if (colors.length === 0) return "none";
	if (colors.length === 1) return colors[0];
	return `linear-gradient(to right, ${colors.join(", ")})`;
}

/** Hard-edged equal-width blocks: each color repeated at both edges of its own share. */
export function blocksBackground(colors: ReadonlyArray<string>): string {
	const count = colors.length;
	if (count === 0) return "none";
	const stops = colors.map(
		(color, i) => `${color} ${percent(i / count)}, ${color} ${percent((i + 1) / count)}`
	);
	return `linear-gradient(to right, ${stops.join(", ")})`;
}

/** Percent position of the index-th of `count` evenly spaced labels. */
export function tickPosition(index: number, count: number): number {
	return count <= 1 ? 0 : (index / (count - 1)) * 100;
}

function percent(fraction: number): string {
	return `${(fraction * 100).toFixed(2)}%`;
}
