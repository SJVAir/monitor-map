import { monitorsManager } from "../monitors/monitors.svelte";
import { tooltipsPlugin, uPlotCursorConfig } from "./tooltip";
import { fromUnixTime, getUnixTime, isToday, isAfter } from "date-fns";
import type uPlot from "uplot";
import type { MonitorType } from "@sjvair/sdk";

const PM25_AVG_60_STROKE = "3572b0";

function getColors(): Array<[number, string]> {
	const levels = monitorsManager.levels ?? [];
	const colors = levels.map((level) => [level.range[0], level.color.replace(/^#/, "")]) as Array<[number, string]>;
	colors.push([Infinity, "000000"]);
	return colors;
}

const baseXSeriesConfig = {};

const baseYSeriesConfig = {
	show: true,
	spanGaps: false,
	width: 1
};

const pm25SeriesConfig = {
	...baseYSeriesConfig,
	label: "Real Time",
	width: 2,
	stroke: (u: uPlot) => scaleGradient(u, "y", 1, getColors(), true)
};

const pm25Avg60SeriesConfig = {
	...baseYSeriesConfig,
	label: "60 Minute Average",
	stroke: (u: uPlot) => autograd(u, PM25_AVG_60_STROKE)
};

export function getChartConfig(
	sourceName: MonitorType,
	maxDiff: number,
	width: number,
	height: number
): uPlot.Options {
	const series: Array<uPlot.Series> = getSeriesConfigs(sourceName);
	const getStroke = (u: uPlot, sIdx: number): string => {
		const stroke = series[sIdx].stroke! as (u: uPlot, sIdx: number) => string | CanvasGradient;
		return stroke(u, sIdx) as string;
	};

	return {
		width,
		height,
		cursor: uPlotCursorConfig.get(),
		// @ts-expect-error: select missing pseudo "required" options
		select: {
			show: false
		},
		plugins: [tooltipsPlugin()],
		series,
		legend: {
			live: false,
			markers: {
				fill: (u, sIdx) => getStroke(u, sIdx)
			}
		},
		scales: {
			x: {
				range: (_: uPlot, min: number, max: number) => {
					const maxDate = fromUnixTime(max);
					const now = new Date();
					max = isToday(maxDate) && isAfter(now, maxDate) ? getUnixTime(now) : max;
					return [min, max];
				}
			},
			y: {
				range: {
					min: {
						mode: 1,
						pad: 0.1
					},
					max: {
						mode: 2,
						soft: 0,
						pad: 0.1
					}
				}
			}
		},
		axes: [
			{
				grid: {
					show: false
				}
			},
			{
				label: monitorsManager.pollutant === "pm25" ? "PM 2.5" : "Ozone",
				side: 3,
				values: (_: uPlot, ticks: number[]) =>
					ticks.map((v: number) => v.toFixed(maxDiff < 5 ? 1 : 0))
			}
		],
		hooks: {
			ready: [() => document.querySelector(".u-series")!.remove()]
		}
	};
}

function getSeriesConfigs(monitorType: MonitorType) {
	const singleSeriesConfig = Object.assign({}, pm25Avg60SeriesConfig);
	singleSeriesConfig.width = 2;

	switch (monitorType) {
		case "airnow":
		case "aqview":
		case "bam1022":
			return [baseXSeriesConfig, singleSeriesConfig];

		case "airgradient":
		case "purpleair":
			return [baseXSeriesConfig, pm25SeriesConfig];
	}
}

function autograd(u: uPlot, fallback: string) {
	if (u.series.length > 2) {
		return fallback;
	}
	return scaleGradient(u, "y", 1, getColors(), true);
}

function scaleGradient(
	u: uPlot,
	scaleKey: string,
	ori: number,
	scaleStops: Array<[number, string]>,
	discrete = false
) {
	const scale = u.scales[scaleKey];

	let minStopIdx!: number;
	let maxStopIdx!: number;

	for (let i = 0; i < scaleStops.length; i++) {
		const stopVal = scaleStops[i][0];

		if (stopVal <= scale.min! || minStopIdx === undefined) {
			minStopIdx = i;
		}

		maxStopIdx = i;

		if (stopVal >= scale.max!) break;
	}

	if (minStopIdx == maxStopIdx) {
		return scaleStops[minStopIdx][1];
	}

	let minStopVal = scaleStops[minStopIdx][0];
	let maxStopVal = scaleStops[maxStopIdx][0];

	if (minStopVal === -Infinity) minStopVal = scale.min! || 0;
	if (maxStopVal === Infinity) maxStopVal = scale.max! || 0;

	const minStopPos = u.valToPos(minStopVal, scaleKey, true);
	const maxStopPos = u.valToPos(maxStopVal, scaleKey, true);

	if (!minStopPos || !maxStopPos) return;

	const range = minStopPos - maxStopPos;
	let x0, y0, x1, y1;

	if (ori == 1) {
		x0 = x1 = 0;
		y0 = minStopPos;
		y1 = maxStopPos;
	} else {
		y0 = y1 = 0;
		x0 = minStopPos;
		x1 = maxStopPos;
	}

	const grd = u.ctx.createLinearGradient(x0, y0, x1, y1);
	let prevColor!: string;

	for (let i = minStopIdx; i <= maxStopIdx; i++) {
		const s = scaleStops[i];
		const stopPos =
			i == minStopIdx
				? minStopPos
				: i == maxStopIdx
					? maxStopPos
					: u.valToPos(s[0], scaleKey, true);
		const pct = (minStopPos - stopPos) / range;

		if (discrete && i > minStopIdx) {
			grd.addColorStop(pct, prevColor);
		}

		grd.addColorStop(pct, (prevColor = `#${s[1]}`));
	}

	return grd;
}
