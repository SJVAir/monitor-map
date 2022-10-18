<script setup lang="ts">
  import { computed, onMounted, onUnmounted, Ref, ref, watch } from 'vue';
  import { useRouter } from 'vue-router';
  import DatePickerVue from './DatePicker.vue';
  import MonitorInfoVue from './MonitorInfo.vue';
  import { MonitorSubscriptionVue } from '../MonitorSubscription';
  import { HumidityDataBoxVue, PM2DataBoxVue, TempDataBoxVue } from "../MonitorDataBox";
  import { focusAssertion, recenter } from "../Map";
  import { getMonitor, downloadCSV, widgetSubList } from "../Monitors";
  import { DataChartVue, fetchChartData } from '../DataChart';
  import { SingleEventListener } from "../models/SingleEventListener";
  import { DateRange } from '../models';
  import type { DatePickerSelection } from '../types';

  const props = defineProps<{ monitorId: string }>();
  const activeMonitor = computed(() => getMonitor(props.monitorId));
  const chartData = ref<uPlot.AlignedData>([]);
  const chartDataLoading = ref<boolean>(false);
  const dateRange = ref(new DateRange());
  const router = useRouter();

  function close() {
    router.replace("/");
  }

  async function csvDownload() {
    downloadCSV(activeMonitor.value, dateRange.value);
  }

  async function loadChartData() {
    chartDataLoading.value = true;
    await fetchChartData(activeMonitor.value, dateRange.value)
      .then(data => {
        chartData.value = data;
        chartDataLoading.value = false;
      })
      .catch(console.error);
  }

  async function updateDateRange(newRange: DatePickerSelection) {
    dateRange.value = new DateRange(newRange);
  }

  watch(
    () => props.monitorId,
    async (monitorID) => {
      focusAssertion(activeMonitor.value);
      chartData.value = [];
      loadChartData();
    }
  );

  onMounted(async () => {
    if (!activeMonitor.value) {
      new SingleEventListener("MonitorsLoaded", async () => {
        window.requestAnimationFrame(() => setTimeout(async () => {
          focusAssertion(activeMonitor.value);
          await loadChartData();
        }, 5));
      });

    } else {
      window.requestAnimationFrame(async () => {
        focusAssertion(activeMonitor.value);
        await loadChartData();
      });
    }
  });

  onUnmounted(() => widgetSubList.value.length || recenter());
</script>

<template>
  <div class="monitor-details columns">
    <span class="close-btn material-symbols-outlined" v-on:click="close">close</span>

    <DataChartVue class="column is-three-fifths" :activeMonitor="activeMonitor" :chartData="chartData" :dateRange="dateRange"></DataChartVue>

    <div class="column data-control">
      <MonitorInfoVue :monitor="activeMonitor"></MonitorInfoVue>
      <MonitorSubscriptionVue :monitor="activeMonitor"></MonitorSubscriptionVue>
      <div class="date-control">
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

      <div v-if="activeMonitor" class="monitor-data-info">
        <PM2DataBoxVue :monitor="activeMonitor"></PM2DataBoxVue>
        <TempDataBoxVue :monitor="activeMonitor"></TempDataBoxVue>
        <HumidityDataBoxVue :monitor="activeMonitor"></HumidityDataBoxVue>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .monitor-details {
    position: relative;
    height: 50vh;
    padding-top: 1rem;

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

      @include bulma.until(bulma.$tablet) {
        margin-top: 2rem;
      }

      .date-control {
        width: 80%;
        display: flex;
        flex-flow: row wrap;
        flex-direction: row;
        justify-content: space-evenly;
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
  }


</style>
