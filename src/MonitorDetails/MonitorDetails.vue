<script setup lang="ts">
  import { ref, watch } from "vue";
  import { useRouter } from "vue-router";
  import DatePickerVue from "./DatePicker.vue";
  import MonitorInfoVue from "./MonitorInfo.vue";
  import WidgetModalVue from "../WidgetModal/WidgetModal.vue";
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
</script>

<template>
  <div class="monitor-details">
    <span class="close-btn material-symbols-outlined" v-on:click="close">close</span>

    <div class="data-control">
      <MonitorInfoVue :monitor="activeMonitor"></MonitorInfoVue>
      <MonitorSubscriptionVue :monitorId="props.monitorId"></MonitorSubscriptionVue>
      <WidgetModalVue :monitorId="props.monitorId"/>
      <div class="date-control is-fullwidth">
        <div class="control">
          <label for="startDate" class="label is-small has-text-weight-normal">Date Range</label>
          <DatePickerVue :startRange="dateRange" @selection="updateDateRange"></DatePickerVue>
        </div>
        <div class="control">
          <br />
          <button class="button is-small is-info" v-on:click="async () => await loadChartData()">
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
          <button class="button is-small is-success" v-on:click="csvDownload">
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

    <div v-if="activeMonitor" class="monitor-data-info">
      <PM2DataBoxVue :monitor="activeMonitor"></PM2DataBoxVue>
      <TempDataBoxVue :monitor="activeMonitor"></TempDataBoxVue>
      <HumidityDataBoxVue :monitor="activeMonitor"></HumidityDataBoxVue>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .monitor-details {
    position: relative;
    padding-top: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 30%;
    min-width: 500px;

    .close-btn {
      position: absolute;
      margin-right: 1rem;
      right: 1rem;
      top: 1rem;
      border: solid 1px;
      border-radius: 4px;
      cursor: pointer;
    }

    .data-control {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 1rem;
      width: 100%;

      @include bulma.until(bulma.$tablet) {
        margin-top: 2rem;
      }

      .date-control {
        display: flex;
        flex-direction: row;
        justify-content: space-evenly;
        align-items: center;
      }
    }

    .monitor-data-info {
      display: flex;
      justify-content: space-evenly;
      align-items: center;
      width: 80%;
      margin-top: 2rem;

      @include bulma.until(bulma.$tablet) {
        gap: 1rem;
      }
    }
  }


</style>
