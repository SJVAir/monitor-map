<script setup lang="ts">
  import { computed, ref, watch } from 'vue';
  import uPlot from "uplot";
  import { getChartConfig } from "./mod";
  import { dateUtil } from '../modules';
  import type { DateRange } from '../models';
  import type { Monitor } from '../Monitors';
  import type { MonitorDevice } from '../types';

  const props = defineProps<{
    activeMonitor: Monitor | undefined,
    chartData: uPlot.AlignedData,
    chartDataLoading: boolean,
    dateRange: DateRange
  }>();

  const sjvairDataChart = ref<HTMLInputElement | null>(null);
  const chartExpanded = ref<boolean>(false);
  const noChartData = computed(() => !props.chartData.length);
  const message = computed(() => {
      return (props.chartDataLoading)
        ? "Loading Data"
        : (noChartData.value)
          ? "No Data Available For Selected Date Range"
          : ""
    });
  const messageSymbol = computed(() => {
      return (props.chartDataLoading)
        ? "refresh"
        : (noChartData.value)
          ? "error"
          : ""
    });
  let uplot: uPlot;

  function buildChart(chartData: uPlot.AlignedData, deviceType: MonitorDevice) {
    if (chartData.length) {
      const flatData = chartData.slice(1, chartData.length).flat() as Array<number>;
      const maxDiff = Math.max(...flatData) - Math.min(...flatData);
      const { width, height } = sjvairDataChart.value!.getBoundingClientRect();
      const opts = getChartConfig(deviceType, maxDiff, width, height - ((height / 100) * 20));

      if (uplot && sjvairDataChart.value) {
        console.log("removing thing")
        sjvairDataChart.value.innerHTML = "";
      }
      uplot = new uPlot(opts, chartData, sjvairDataChart.value as HTMLElement);
    }
  }

  function toggleChart() {
    chartExpanded.value = !chartExpanded.value;;
    setTimeout(() => {
      buildChart(props.chartData, props.activeMonitor!.data.device);
    }, 0)
  }

  function formatDate(date: string) {
    return dateUtil(date).format("DD.MMM.YYYY");
  }

  function downloadChart() {
    if (props.activeMonitor) {
      const link = document.createElement('a');
      const monitorName = `${ props.activeMonitor.data.name.split(" ").join("-") }`;
      let { start, end} = props.dateRange;
      start = formatDate(start);
      end = formatDate(end);
      link.download = `${ monitorName }_${ start }-${ end }.png`;
      link.href = uplot.ctx.canvas.toDataURL()
      link.click();
    }
  }

  watch(
    () => props.chartData,
    (chartData) => {
      if (props.activeMonitor) {
        buildChart(chartData, props.activeMonitor.data.device);
      }
    },
    {
      immediate: true
    }
  );
</script>

<template>
  <div :class="{ 'expanded': chartExpanded }" class="data-chart-container card pb-4 pt-2">
    <span v-if="!chartExpanded" class="icon is-clickable fullscreen-svg" title="Expand Chart" @click="toggleChart"></span>
    <span v-else class="icon is-clickable material-symbols-outlined" v-on:click="toggleChart">close</span>
    <h1 :class="{ 'show': props.chartDataLoading || noChartData }" class="data-chart-notice">
      <span :class="{ 'spin': props.chartDataLoading }" class="material-symbols-outlined">
        {{ messageSymbol }}
      </span>
      <br/>
      {{ message }}
    </h1>
    <h1 :class="{ 'hidden': props.chartDataLoading || noChartData }" class="has-text-centered is-size-5 has-text-weight-bold">
      Real Time PM Readings
    </h1>
    <div ref="sjvairDataChart" @click.shift="downloadChart" :class="{ 'hidden': props.chartDataLoading || noChartData }" class="data-chart mt-2"></div>
  </div>
</template>

<style scoped lang="scss">
  .spin {
    animation: spinner 1s linear infinite;
  }
  .data-chart-container {
    margin-top: 1rem;
    position: relative;
    height: 375px;
    width: 90%;

    &.expanded {
      height: 68vh;
      position: fixed;
      right: 50%;
      top: 50%;
      transform: translate(50%, -50%);
      z-index: 10000;

      h1:not(.data-chart-notice) {
        margin-top: 2rem;
      }

    }

    .icon {
      position: absolute;
      right: 2px;
      top: 2px;
    }

    h1 {

      &.data-chart-notice {
        position: absolute;
        transform-origin: center;
        transform: translate(-50%, 30%);
        left: 50%;
        top: 30%;
        visibility: hidden;
        font-weight: 700;
        font-size: 1.5rem;
        text-align: center;

        span {
          font-size: 2rem;
        }
      }

      &.show {
        visibility: visible;
      }
    }

    .data-chart {
      height: 100%;
      width: 100%;
    }

    .hidden {
      visibility: hidden;
    }
  }
</style>
