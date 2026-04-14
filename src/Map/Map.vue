<script setup lang="ts">
import { onMounted, ref } from "vue";
import MarkerLegendVue from "./MarkerLegend.vue";
import FireLegendVue from "./FireLegend.vue";
import MonitorSearch from "../monitor-search/MonitorSearch.vue";
import Geolocate from "./Geolocate.vue";
import { useInteractiveMap } from "./InteractiveMap";

const mapTarget = ref<HTMLDivElement>();
const { mapContainer } = await useInteractiveMap();

onMounted(async () => {
  mapTarget.value!.appendChild(mapContainer);
});
</script>

<template>
  <div ref="mapTarget" class="map section is-paddingless">
    <MonitorSearch class="monitor-search"></MonitorSearch>
    <div class="map-footer">
      <div class="legend-container">
        <fireLegendVue class="fire-legend"></fireLegendVue>
        <MarkerLegendVue class="marker-legend"></MarkerLegendVue>
      </div>
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
    top: 0.5rem;
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
    pointer-events: none;

    .legend-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      pointer-events: none;

      .fire-legend,
      .marker-legend {
        pointer-events: auto;
      }

      .fire-legend {
        bottom: 1rem;
        right: 0.75rem;
      }
    }

    .geolocate {
      align-self: flex-end;
      pointer-events: auto;
    }
  }
}
</style>
