<script setup lang="ts">
  import { onBeforeUnmount, onMounted, Ref, ref } from "vue";
  import { useRoute } from "vue-router";
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

    monitorUpdateInterval = window.setInterval(async () => await loadMonitors(), 1000 * 60 * 2);

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
  <div ref="mapTarget" class="map section is-paddingless"></div>
</template>

<style scoped lang="scss">
  .map {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: stretch;
  }
</style>
