<script setup lang="ts">
  import { onBeforeUnmount, onMounted, Ref, ref } from "vue";
  import { mapContainer } from "./InteractiveMap";
  import { cacheMapStateOnLeave, unmount, updateBounds, updateMapMarkers } from "./mod";
  import { tempFetchMonitors } from "../Monitors";
  import type { Monitor } from "../Monitors";

  const mapTarget: Ref<HTMLDivElement | null> = ref(null)
  const stopCaching = cacheMapStateOnLeave();

  let activeMonitor: Monitor;
  let monitorUpdateInterval: number;

  async function loadMonitors() {
    await tempFetchMonitors();
    updateMapMarkers();
  }

  onMounted(async () => {
    await loadMonitors();

    window.requestAnimationFrame(() => mapTarget.value!.appendChild(mapContainer));

    monitorUpdateInterval = window.setInterval(async () => await loadMonitors(), 1000 * 60 * 2);

    if (!activeMonitor) {
      setTimeout(() => updateBounds(), 5);
    }
  });

  onBeforeUnmount(() => {
    // Ensure the monitor update interval is cleared
    if(monitorUpdateInterval) {
      clearInterval(monitorUpdateInterval);
      monitorUpdateInterval = 0;
    }
    unmount();
  });
</script>

<template>
  <div ref="mapTarget" class="map"></div>
</template>

<style scoped lang="scss">
  .map {
    width: 100vw;
    height:100vh;
  }
</style>
