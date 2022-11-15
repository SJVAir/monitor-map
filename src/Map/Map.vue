<script setup lang="ts">
  import { Ref, ref } from "vue";
  import MarkerLegendVue from "./MarkerLegend.vue";
  import { initializeInteractiveMap } from "./InteractiveMap";

  const mapTarget = ref<HTMLDivElement>();
  await initializeInteractiveMap(mapTarget as Ref<HTMLDivElement>);

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
