<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import uPlot from "uplot";
import { getChartConfig } from "./mod";
import { dateUtil } from '../modules';
import type { DateRange } from '../models';
import type { Monitor } from '../Monitors';

const props = defineProps<{
  activeMonitor: Monitor | undefined,
  chartData: uPlot.AlignedData,
  chartDataLoading: boolean,
  chartExpanded: boolean,
  dateRange: DateRange
}>();

const sjvairDataChart = ref<HTMLInputElement | null>(null);
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

function buildChart() {
  if (props.chartData.length && props.activeMonitor && sjvairDataChart.value) {
    if (uplot && sjvairDataChart.value) {
      sjvairDataChart.value.innerHTML = "";
    }
    const { name: sourceName } = props.activeMonitor.data.data_source;
    const flatData = props.chartData.slice(1, props.chartData.length).flat() as Array<number>;
    const maxDiff = Math.max(...flatData) - Math.min(...flatData);
    const { width, height } = sjvairDataChart.value!.getBoundingClientRect();
    const opts = getChartConfig(sourceName, maxDiff, width, height - ((height / 100) * 20));

    console.log("chartData:", props.chartData)
    console.log("opts:", opts)
    uplot = new uPlot(opts, props.chartData, sjvairDataChart.value as HTMLElement);
  }
}


function formatDate(date: string) {
  return dateUtil(date).format("DD.MMM.YYYY");
}

function downloadChart() {
  if (props.activeMonitor) {
    const link = document.createElement('a');
    const monitorName = `${props.activeMonitor.data.name.split(" ").join("-")}`;
    let { start, end } = props.dateRange;
    start = formatDate(start);
    end = formatDate(end);
    link.download = `${monitorName}_${start}-${end}.png`;
    link.href = uplot.ctx.canvas.toDataURL()
    link.click();
  }
}

watch(
  () => props.chartData,
  () => buildChart()
);

// Macrotask to ensure classes have been applied to elements
watch(
  () => props.chartExpanded,
  () => setTimeout(() => buildChart(), 0)
);

onMounted(() => {
  if (props.activeMonitor) {
    buildChart();
  }
});
</script>

<template>
  <div class="data-chart">
    <h1 :class="{ 'show': props.chartDataLoading || noChartData }" class="data-chart-notice">
      <span translate="no" :class="{ 'spin': props.chartDataLoading }" class="material-symbols-outlined">
        {{ messageSymbol }}
      </span>
      <br />
      {{ message }}
    </h1>
    <h1 :class="{ 'hidden': props.chartDataLoading || noChartData }"
      class="has-text-centered is-size-5 has-text-weight-bold">
      Real Time PM Readings
    </h1>
    <div ref="sjvairDataChart" @click.shift="downloadChart" :class="{ 'hidden': props.chartDataLoading || noChartData }"
      class="chart mt-2"></div>
  </div>
</template>

<style scoped lang="scss">
.spin {
  animation: spinner 1s linear infinite;
}

.data-chart {
  min-height: 375px;
  height: 100%;

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

  .chart {
    height: 100%;
    width: 100%;
  }

  .hidden {
    visibility: hidden;
  }
}
</style>
