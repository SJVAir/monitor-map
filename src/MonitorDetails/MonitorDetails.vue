<script setup lang="ts">
  import { onUnmounted, watch } from "vue";
  import { useRouter } from "vue-router";
  import MonitorInfoVue from "./MonitorInfo.vue";
  import WidgetModalVue from "../WidgetModal/WidgetModal.vue";
  import { MonitorSubscriptionVue } from "../MonitorSubscription";
  import { DataChartVue } from "../DataChart";
  import { HumidityDataBoxVue, PM2DataBoxVue, TempDataBoxVue } from "../MonitorDataBox";
  import { SelectedMarker } from "../DisplayOptions/MonitorMarkers";
  import { useMonitorsService } from "../Monitors";

  const props = defineProps<{ monitorId: string }>();
  const { activeMonitor, getMonitor } = await useMonitorsService();
  const router = useRouter();

  function close() {
    router.replace("/");
  }

  watch(
    () => props.monitorId,
    (monitorId, oldMonitorID) => {
      if (monitorId !== oldMonitorID) {
        activeMonitor.value = getMonitor(monitorId);
        new SelectedMarker(activeMonitor.value.data.id);
      }
    },
    { immediate: true }
  );

  onUnmounted(() => SelectedMarker.current?.clear());
</script>

<template>
  <div class="monitor-details is-flex is-align-items-center is-flex-direction-column">
    <span class="close-btn material-symbols-outlined" v-on:click="close">close</span>

    <MonitorInfoVue class="mb-4" :monitor="activeMonitor"></MonitorInfoVue>

    <div v-if="activeMonitor" class="monitor-data-info">
      <PM2DataBoxVue :monitor="activeMonitor"></PM2DataBoxVue>
      <TempDataBoxVue :monitor="activeMonitor"></TempDataBoxVue>
      <HumidityDataBoxVue :monitor="activeMonitor"></HumidityDataBoxVue>
    </div>

    <div class="user-options is-flex is-justify-content-space-evenly is-align-items-center">
      <MonitorSubscriptionVue :monitorId="props.monitorId" class="is-inline-block"></MonitorSubscriptionVue>
      <WidgetModalVue :monitorId="props.monitorId" class="is-inline-block"/>
    </div>


    <DataChartVue></DataChartVue>
  </div>

</template>

<style scoped lang="scss">
  .monitor-details {
    /*
    background-color: #fdfdfd;
    */
    background-color: bulma.$white-bis;
    position: relative;
    max-width: 100vw;
    width: 100%;
    height: 50vh;
    overflow: auto;
    overflow-x: hidden;
    gap: 2rem;

    @include bulma.from(bulma.$tablet) {
      width: 30%;
      min-width: 500px;
      height: 100vh;
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

    .user-options {
      width: 90%;
    }
  }
</style>
