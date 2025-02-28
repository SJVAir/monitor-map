<script setup lang="ts">
import { onMounted, ref } from "vue";
import MarkerLegendVue from "./MarkerLegend.vue";
import MonitorSearch from "../monitor-search/MonitorSearch.vue";
import { useInteractiveMap } from "./InteractiveMap";

const mapTarget = ref<HTMLDivElement>();
const { mapContainer } = await useInteractiveMap();

onMounted(() => {
  window.requestAnimationFrame(() => mapTarget.value!.appendChild(mapContainer));
});
</script>

<template>
  <div ref="mapTarget" class="map section is-paddingless">
    <MonitorSearch class="monitor-search"></MonitorSearch>
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

  .monitor-search {
    position: absolute;
    left: 25rem;
    z-index: 500;
  }

  .marker-legend {
    position: absolute;
    left: 2.5rem;
    bottom: 3rem;
    z-index: 1000;
  }
}
</style>
