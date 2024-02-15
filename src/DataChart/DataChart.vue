<script setup lang="ts">
  import { ref, watch } from "vue";
  import ChartVue from "./Chart.vue";
  import DatePickerVue from "../MonitorDetails/DatePicker.vue";
  import { useMonitorsService } from "../Monitors";
  import { useInteractiveMap } from "../Map";
  import { useDataChartService } from "../DataChart";
  import { DateRange } from "../models";
  import type { DatePickerSelection } from "../types";

  const { activeMonitor, downloadCSV } = await useMonitorsService();
  const chartData = ref<uPlot.AlignedData>([]);
  const chartDataLoading = ref<boolean>(false);
  const dateRange = ref(new DateRange());
  const chartExpanded = ref<boolean>(false);
  const { focusAssertion } = await useInteractiveMap();
  const { fetchChartData } = await useDataChartService();

  async function csvDownload() {
    if (activeMonitor.value) {
      downloadCSV(activeMonitor.value, dateRange.value);
    }
  }

  async function updateDateRange(newRange: DatePickerSelection) {
    dateRange.value = new DateRange(newRange);
  }

  function toggleChart() {
    chartExpanded.value = !chartExpanded.value;
  }

  async function loadChartData() {
    chartDataLoading.value = true;

    await fetchChartData(activeMonitor.value!, dateRange.value)
      .then((data: uPlot.AlignedData) => {
        chartData.value = data;
        chartDataLoading.value = false;
      })
      .catch((err: any) => {
        console.error("Failed to load chart data: ", err);
        return [];
      });
  }

  watch(
    () => activeMonitor.value,
    () => {
      if (activeMonitor.value !== undefined) {
        // Leaflet already calls requestAnimationFrame, macrotask for smoother animation
        setTimeout(() => focusAssertion(activeMonitor.value!), 5);
        loadChartData();
      }
    },
    { immediate: true }
  );
</script>

<template>
  <div class="backdrop is-flex is-flex-direction-column is-align-items-center is-justify-content-center" :class="{ 'visible': chartExpanded }">
    <div :class="{ 'expanded': chartExpanded }" class="data-control is-flex is-flex-direction-column is-align-items-center card pb-4 pt-2 mb-6">
      <span v-if="!chartExpanded" class="expand icon is-clickable fullscreen-svg" title="Expand Chart" @click="toggleChart"></span>
      <span v-else class="expand icon is-clickable material-symbols-outlined" v-on:click="toggleChart">close</span>

      <div class="date-control mt-2 is-flex is-align-items-center is-justify-content-space-evenly">
        <div class="control">
          <label for="startDate" class="label is-small has-text-weight-normal">Date Range</label>
          <DatePickerVue :startRange="dateRange" @selection="updateDateRange"></DatePickerVue>
        </div>

        <div class="control">
          <br/>
          <button class="button is-small is-info is-size-7 has-text-weight-semibold" v-on:click="async () => await loadChartData()">
            <span class="icon is-small">
              <span :class="{ 'spin': chartDataLoading }" class="material-symbols-outlined">
                refresh
              </span>
            </span>
            <span>Update</span>
          </button>
        </div>
      </div>

      <div class="data-chart-container">
        <ChartVue :activeMonitor="activeMonitor" :chartData="chartData" :dateRange="dateRange" 
          :chartExpanded="chartExpanded" :chartDataLoading="chartDataLoading"></ChartVue>
      </div>

        <div class="download control is-align-self-flex-end">
          <button class="button is-small is-success is-size-7 has-text-weight-semibold" v-on:click="csvDownload">
            <span class="icon is-small">
              <span class="material-symbols-outlined">file_download</span>
            </span>
            <span>Download</span>
          </button>
        </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .backdrop {
    transition: 200ms;
    width: 100%;

    &.visible {
      opacity: 1;
      z-index: 9999;
      position: fixed;
      top: 0;
      left: 0;
      height: 100%;
      z-index: 9000;
      background-color: rgba(0, 0, 0, .5);
      -webkit-backdrop-filter: blur(9.9px);
      backdrop-filter: blur(9.9px);
    }

    .data-control {
      opacity: 1;
      gap: 1rem;
      position: relative;
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

      .expand.icon {
        position: absolute;
        right: 2px;
        top: 2px;
      }

      @include bulma.until(bulma.$tablet) {
        margin-top: 2rem;
      }

      .date-control {
        max-width: 450px;
        gap: 2rem;
      }

      .data-chart-container {
        width: 100%;
        height: 100%;
      }

      .user-options {
        width: 90%;
      }

      .download {
        margin-right: 2rem;
      }
    }
  }
</style>
