<script setup lang="ts">
import { computed } from "vue";
import { useHMSFire, fireLayer } from "../DisplayOptions/HMSFire";

const hmsFire = await useHMSFire();

const show = computed(() => {
  return hmsFire.fire.model.value && fireLayer.getLayers().length > 0;
});
</script>

<template>
  <div
    v-if="show"
    class="fire-legend-container card is-flex is-flex-direction-column"
  >
    <h3 class="has-text-centered has-text-wrap-nowrap has-font-weight-semibold">
      Fire Points
    </h3>
    <div>
      <div class="is-flex">
        <div class="leaflet-fire-icon">
          <span class="sm material-symbols-outlined">emergency_heat</span>
        </div>
        <p><10 MW</p>
      </div>
      <div class="is-flex">
        <div class="leaflet-fire-icon">
          <span class="md material-symbols-outlined">emergency_heat</span>
        </div>
        <p>10-49 MW</p>
      </div>
      <div class="is-flex">
        <div class="leaflet-fire-icon">
          <span class="lg material-symbols-outlined">emergency_heat</span>
        </div>
        <p>50-149 MW</p>
      </div>
      <div class="is-flex">
        <div class="leaflet-fire-icon">
          <span class="xl material-symbols-outlined">emergency_heat</span>
        </div>
        <p>150-349 MW</p>
      </div>
      <div class="is-flex">
        <div class="leaflet-fire-icon">
          <span class="xxl material-symbols-outlined">emergency_heat</span>
        </div>
        <p>≥350 MW</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.fire-legend-container {
  width: fit-content;
  position: absolute;
  padding: 0.5em !important;
  border: 1px solid black;
}
.leaflet-fire-icon {
  width: 30px;
}
p {
  white-space: nowrap;
}
</style>
