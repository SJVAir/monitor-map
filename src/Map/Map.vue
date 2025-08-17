<script setup lang="ts">
import { onMounted, ref } from "vue";
import MarkerLegendVue from "./MarkerLegend.vue";
import MonitorSearch from "../monitor-search/MonitorSearch.vue";
import Geolocate from "./Geolocate.vue";
import { useInteractiveMap } from "./InteractiveMap";

const mapTarget = ref<HTMLDivElement>();
const { mapContainer } = await useInteractiveMap();

onMounted(async () => {
  window.requestAnimationFrame(() => mapTarget.value!.appendChild(mapContainer));
});
</script>

<template>
  <div ref="mapTarget" class="map section is-paddingless">
    <MonitorSearch class="monitor-search"></MonitorSearch>
    <div class="map-footer">
      <MarkerLegendVue class="marker-legend"></MarkerLegendVue>
      <Geolocate class="geolocate"></Geolocate>
    </div>
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
    left: 14rem;
    top: .5rem;
    z-index: 500;
  }

  .map-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2.5rem;
    width: 100%;
    position: absolute;
    bottom: 3rem;
    z-index: 1000;
  }

}
</style>
