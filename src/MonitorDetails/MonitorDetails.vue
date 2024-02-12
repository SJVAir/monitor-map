<script setup lang="ts">
  import { onUnmounted, ref, watch } from "vue";
  import { useRouter } from "vue-router";
  import DatePickerVue from "./DatePicker.vue";
  import MonitorInfoVue from "./MonitorInfo.vue";
  import WidgetModalVue from "../WidgetModal/WidgetModal.vue";
  import { clearSelectedMarker, setSelectedMarker } from "../DisplayOptions/MonitorMarkers";
  import { MonitorSubscriptionVue } from "../MonitorSubscription";
  import { HumidityDataBoxVue, PM2DataBoxVue, TempDataBoxVue } from "../MonitorDataBox";
  import { useInteractiveMap } from "../Map";
  import { useMonitorsService } from "../Monitors";
  import { DataChartVue, useDataChartService } from "../DataChart";
  import { DateRange } from "../models";
  import type { DatePickerSelection } from "../types";

  const props = defineProps<{ monitorId: string }>();
  const { activeMonitor, getMonitor, downloadCSV } = await useMonitorsService();
  const chartData = ref<uPlot.AlignedData>([]);
  const chartDataLoading = ref<boolean>(false);
  const dateRange = ref(new DateRange());
  const { focusAssertion } = await useInteractiveMap();
  const { fetchChartData } = await useDataChartService();
  const router = useRouter();

  function close() {
    router.replace("/");
  }

  async function csvDownload() {
    if (activeMonitor.value) {
      downloadCSV(activeMonitor.value, dateRange.value);
    }
  }

  async function loadChartData() {
    if (activeMonitor.value) {
      chartDataLoading.value = true;
      await fetchChartData(activeMonitor.value, dateRange.value)
        .then((data: uPlot.AlignedData) => {
          chartData.value = data;
          chartDataLoading.value = false;
        })
        .catch((err: any) => console.error("Failed to load chart data: ", err));
    }
  }

  async function updateDateRange(newRange: DatePickerSelection) {
    dateRange.value = new DateRange(newRange);
  }

  watch(
    () => props.monitorId,
    (monitorId, oldMonitorID) => {
      if (monitorId !== oldMonitorID) {
        activeMonitor.value = getMonitor(monitorId);
        setSelectedMarker(activeMonitor.value.data.id);
      }

      if (activeMonitor.value !== undefined) {
        // Leaflet already calls requestAnimationFrame, macrotask for smoother animation
        setTimeout(() => focusAssertion(activeMonitor.value!), 5);
        loadChartData();
      }
      chartData.value = [];
    },
    { immediate: true }
  );

  onUnmounted(() => clearSelectedMarker());
</script>

<template>
  <div class="monitor-details is-flex is-align-items-center is-flex-direction-column mb-2">
    <span class="close-btn material-symbols-outlined" v-on:click="close">close</span>

    <MonitorInfoVue :monitor="activeMonitor"></MonitorInfoVue>

    <div class="data-control">
      <div v-if="activeMonitor" class="monitor-data-info mb-4">
        <PM2DataBoxVue :monitor="activeMonitor"></PM2DataBoxVue>
        <TempDataBoxVue :monitor="activeMonitor"></TempDataBoxVue>
        <HumidityDataBoxVue :monitor="activeMonitor"></HumidityDataBoxVue>
      </div>
      <div class="user-options is-flex is-justify-content-space-evenly is-align-items-center">
        <MonitorSubscriptionVue :monitorId="props.monitorId" class="is-inline-block"></MonitorSubscriptionVue>
        <WidgetModalVue :monitorId="props.monitorId" class="is-inline-block"/>
      </div>
      <div class="date-control mt-2">
        <div class="control">
          <label for="startDate" class="label is-small has-text-weight-normal">Date Range</label>
          <DatePickerVue :startRange="dateRange" @selection="updateDateRange"></DatePickerVue>
        </div>
        <div class="control">
          <br />
          <button class="button is-small is-info is-size-7 has-text-weight-semibold" v-on:click="async () => await loadChartData()">
            <span class="icon is-small">
              <span :class="{ 'spin': chartDataLoading }" class="material-symbols-outlined">
                refresh
              </span>
            </span>
            <span>Update</span>
          </button>
        </div>
        <div class="control">
          <br />
          <button class="button is-small is-success is-size-7 has-text-weight-semibold" v-on:click="csvDownload">
            <span class="icon is-small">
              <span class="material-symbols-outlined">file_download</span>
            </span>
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>

    <DataChartVue  :activeMonitor="activeMonitor"
      :chartData="chartData" :dateRange="dateRange" :chartDataLoading="chartDataLoading"></DataChartVue>

  </div>
</template>

<style scoped lang="scss">
  .monitor-details {
    position: relative;
    width: 30%;
    min-width: 500px;
    overflow: auto;
    overflow-x: hidden;
    gap: 1rem;

    @include bulma.until(bulma.$tablet) {
      width: 100%;
      height: 50vh;
    }

    .close-btn {
      position: absolute;
      right: 1rem;
      top: 1rem;
      border: solid 1px;
      border-radius: 4px;
      cursor: pointer;
    }

    .monitor-data-info {
      display: flex;
      justify-content: space-evenly;
      align-items: center;
      width: 80%;

      @include bulma.until(bulma.$tablet) {
        gap: 1rem;
      }
    }

    .data-control {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      gap: 1rem;

      @include bulma.until(bulma.$tablet) {
        margin-top: 2rem;
      }

      .user-options {
        width: 90%;
      }

      .date-control {
        display: flex;
        flex-direction: row;
        justify-content: space-evenly;
        align-items: center;
        width: 100%;
      }
    }
  }
</style>
