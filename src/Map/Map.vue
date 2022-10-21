<script setup lang="ts">
  import { onBeforeUnmount, onMounted, Ref, ref } from "vue";
  import { useRoute } from "vue-router";
  import MarkerLegendVue from "./MarkerLegend.vue";
  import { mapContainer } from "./InteractiveMap";
  import { cacheMapStateOnLeave, unmount, updateBounds, updateMapMarkers } from "./mod";
  import { fetchMonitors } from "../Monitors";
  import { SingleEventListener } from "../models/SingleEventListener";

  const event = new Event("MapLoaded");
  const mapTarget: Ref<HTMLDivElement | null> = ref(null)
  const stopCaching = cacheMapStateOnLeave();
  const route = useRoute();

  let monitorUpdateInterval: number;

  new SingleEventListener("MapLoaded", () => {
    if (!("monitorID" in route.params)) {
      setTimeout(() => updateBounds(), 5);
    }
  });

  async function loadMonitors() {
    await fetchMonitors();
    updateMapMarkers();
  }

  onMounted(async () => {
    await loadMonitors();

    window.requestAnimationFrame(() => mapTarget.value!.appendChild(mapContainer));

    monitorUpdateInterval = window.setInterval(async () => await loadMonitors(), 1000 * 60 * 60);

    window.dispatchEvent(event);
  });

  onBeforeUnmount(() => {
    // Ensure the monitor update interval is cleared
    if(monitorUpdateInterval) {
      clearInterval(monitorUpdateInterval);
      monitorUpdateInterval = 0;
    }
    stopCaching();
    unmount();
  });
</script>

<template>
  <div ref="mapTarget" class="map section is-paddingless">
    <MarkerLegendVue class="marker-legend"></MarkerLegendVue>
  </div>
</template>

<style scoped lang="scss">
  .map {
    position: relative;
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: stretch;

    .marker-legend {
      position: absolute;
      left: 2.5rem;
      bottom: 3rem;
      z-index: 1000;
    }
  }
</style>
