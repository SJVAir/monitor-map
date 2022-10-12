import { MonitorDataField, MonitorFieldColors } from "../Monitors";
import { dateUtil, valueToColor } from "../modules";
import { tooltipsPlugin, uPlotCursorConfig } from "./tooltip";
import type { Dayjs } from "dayjs";
import type { ChartDataField, IMonitorEntry, MonitorDevice } from "../types";
import type uPlot from "uplot";

const colors = MonitorDataField.levels.map(level => [level.min, level.color]) as Array<[number, string]>;

const baseXSeriesConfig = {};

const baseYSeriesConfig = {
    show: true,
    spanGaps: false,
    width: 1,
};

const pm25SeriesConfig = {
  ...baseYSeriesConfig,
  label: "PM 2.5",
  width: 2,
  stroke: (u: uPlot, _: number) => scaleGradient(u, 'y', 1, colors, true),
}

const pm25Avg15SeriesConfig = {
  ...baseYSeriesConfig,
  label: "PM 2.5 (15 Minute Average)",
  stroke: (u: uPlot, _: number) => autograd(u, MonitorFieldColors.pm25_avg_15)
}

const pm25Avg60SeriesConfig = {
  ...baseYSeriesConfig,
  label: "PM 2.5 (60 Minute Average)",
  stroke: (u: uPlot, _: number) => autograd(u, MonitorFieldColors.pm25_avg_60)
}

export function getChartConfig(deviceType: MonitorDevice, maxDiff: number, width: number, height: number): uPlot.Options {
  const series: Array<uPlot.Series> = getSeriesConfigs(deviceType);
  const getStroke = (u: uPlot, sIdx: number): string => {
    const stroke = series[sIdx].stroke! as (u: uPlot, sIdx: number) => string | CanvasGradient;
    const val = stroke(u, sIdx) as string;
    return val;
  }

  return {
    //title: "Real Time PM Readings",
    width,
    height,
    cursor: uPlotCursorConfig.get(),
    //@ts-ignore
    select: {
      show: false
    },
    plugins: [ tooltipsPlugin()],
    series,
    legend: {
      live: false,
      markers: {
        fill: (u, sIdx) => getStroke(u, sIdx),
      }
    },
    scales: {
      x: {
        range: (_: uPlot, min: number, max: number) => {
          return [min - 10, max + 10];
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
        label: "PM 2.5",
        side: 3,
        values: (_: any, ticks: any) => ticks.map((v:any) => v.toFixed((maxDiff < 5) ? 1 : 0)),
      }
    ]
  };

}

export function getSeriesConfigs(deviceType: MonitorDevice) {
  let singleSeriesConfig = Object.assign({}, pm25Avg60SeriesConfig);
  singleSeriesConfig.width = 2;

  switch (deviceType) {
    case "AirNow":
      return [
        baseXSeriesConfig,
        singleSeriesConfig
      ];

    case "BAM1022":
      return [
        baseXSeriesConfig,
        singleSeriesConfig
      ];

    case "PurpleAir":
      return [
        baseXSeriesConfig,
        pm25SeriesConfig,
        pm25Avg15SeriesConfig,
        pm25Avg60SeriesConfig
      ];
  }
}

function autograd(u: uPlot, fallback: string) {
  if (u.series.length > 3) {
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

    grd.addColorStop(pct, prevColor = `#${ s[1] }`);
  }

  return grd;
}

export function fillChartDataRecords(
  xAxisData: Array<Dayjs>,
  yAxisRecord: Map<ChartDataField, Array<number | null>>,
  entry: IMonitorEntry,
  timestamp?: string | Dayjs,
) {
  if (timestamp) {
    xAxisData.push(dateUtil(timestamp).utc().tz('America/Los_Angeles'));
  } else {
    xAxisData.push(dateUtil(entry.timestamp).utc().tz('America/Los_Angeles'));
  }

  for (let dataKey of yAxisRecord.keys()) {
    if (dataKey in entry) {
      const collection = yAxisRecord.get(dataKey)!;
      let dataPoint: number | null;

      if (timestamp) {
        dataPoint = null
      } else {
        dataPoint = parseFloat(entry[dataKey])
      }

      collection.push(dataPoint);
    }
  }
}
