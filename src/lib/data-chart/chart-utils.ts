import { MonitorDataField, MonitorFieldColors, primaryPollutant } from "../Monitors";
import { dateUtil } from "../modules";
import { tooltipsPlugin, uPlotCursorConfig } from "./tooltip";
import type uPlot from "uplot";
import type { MonitorType } from "@sjvair/sdk";

const colors = MonitorDataField.levels.map(level => [level.min, level.color]) as Array<[number, string]>;
// Append stop color value
colors.push([Infinity, "000000"]);

const baseXSeriesConfig = {};

const baseYSeriesConfig = {
  show: true,
  spanGaps: false,
  width: 1,
};

const pm25SeriesConfig = {
  ...baseYSeriesConfig,
  label: "Real Time",
  width: 2,
  stroke: (u: uPlot, _: number) => scaleGradient(u, 'y', 1, colors, true),
}

const pm25Avg60SeriesConfig = {
  ...baseYSeriesConfig,
  label: "60 Minute Average",
  stroke: (u: uPlot, _: number) => autograd(u, MonitorFieldColors.pm25_avg_60)
}

export function getChartConfig(sourceName: MonitorType, maxDiff: number, width: number, height: number): uPlot.Options {
  const series: Array<uPlot.Series> = getSeriesConfigs(sourceName);
  const getStroke = (u: uPlot, sIdx: number): string => {
    const stroke = series[sIdx].stroke! as (u: uPlot, sIdx: number) => string | CanvasGradient;
    const val = stroke(u, sIdx) as string;
    return val;
  }

  return {
    width,
    height,
    cursor: uPlotCursorConfig.get(),
    //@ts-ignore: select missing psudo "required" options
    select: {
      show: false
    },
    plugins: [tooltipsPlugin()],
    series,
    legend: {
      live: false,
      markers: {
        fill: (u, sIdx) => getStroke(u, sIdx),
      },
    },
    scales: {
      x: {
        range: (_: uPlot, min: number, max: number) => {
          // if "today": force chart to display up to current moment for "today"
          const maxDate = dateUtil.unix(max);
          const now = dateUtil().tz("America/Los_Angeles");
          max = (now.isSame(maxDate, "day") && now.isAfter(maxDate))
            ? now.unix()
            : max;
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
            pad: 0.1,
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
        label: primaryPollutant.value === "pm25" ? "PM 2.5" : "Ozone",
        side: 3,
        values: (_: any, ticks: any) => ticks.map((v: any) => v.toFixed((maxDiff < 5) ? 1 : 0)),
      }
    ],
    hooks: {
      ready: [
        () => document.querySelector(".u-series")!.remove()
      ]
    }
  };
}

function getSeriesConfigs(monitorType: MonitorType) {
  let singleSeriesConfig = Object.assign({}, pm25Avg60SeriesConfig);
  singleSeriesConfig.width = 2;

  switch (monitorType) {
    case "airnow":
    case "aqview":
    case "bam1022":
      return [
        baseXSeriesConfig,
        singleSeriesConfig
      ];

    case "airgradient":
    case "purpleair":
      return [
        baseXSeriesConfig,
        pm25SeriesConfig,
      ];
  }
}

function autograd(u: uPlot, fallback: string) {
  if (u.series.length > 2) {
    return fallback;
  }
  return scaleGradient(u, 'y', 1, colors, true);
}

function scaleGradient(u: uPlot, scaleKey: string, ori: number, scaleStops: Array<[number, string]>, discrete = false) {
  let scale = u.scales[scaleKey];

  // we want the stop below or at the scaleMax
  // and the stop below or at the scaleMin, else the stop above scaleMin
  let minStopIdx!: number;
  let maxStopIdx!: number;

  for (let i = 0; i < scaleStops.length; i++) {
    let stopVal = scaleStops[i][0];

    if (stopVal <= scale.min! || minStopIdx === undefined) {
      minStopIdx = i;
    }

    maxStopIdx = i;

    if (stopVal >= scale.max!)
      break;
  }

  if (minStopIdx == maxStopIdx) {
    return scaleStops[minStopIdx][1];
  }

  let minStopVal = scaleStops[minStopIdx][0];
  let maxStopVal = scaleStops[maxStopIdx][0];

  if (minStopVal === -Infinity) {
    minStopVal = scale.min! || 0;
  }

  if (maxStopVal === Infinity) {
    maxStopVal = scale.max! || 0;
  }

  let minStopPos = u.valToPos(minStopVal, scaleKey, true);
  let maxStopPos = u.valToPos(maxStopVal, scaleKey, true);

  if (!minStopPos || !maxStopPos) {
    return;
  }

  let range = minStopPos - maxStopPos;

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

  let grd = u.ctx.createLinearGradient(x0, y0, x1, y1);

  let prevColor!: string;

  for (let i = minStopIdx; i <= maxStopIdx; i++) {
    let s = scaleStops[i];

    let stopPos = i == minStopIdx ? minStopPos : i == maxStopIdx ? maxStopPos : u.valToPos(s[0], scaleKey, true);
    let pct = (minStopPos - stopPos) / range;

    if (discrete && i > minStopIdx) {
      grd.addColorStop(pct, prevColor);
    }

    grd.addColorStop(pct, prevColor = `#${s[1]}`);
  }

  return grd;
}
