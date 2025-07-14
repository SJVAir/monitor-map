<script setup lang="ts">
import { computed } from "vue";
import { primaryPollutant } from "../Monitors";

const label = computed(() => {
  return primaryPollutant.value === "pm25"
    ? "PM 2.5"
    : "Ozone";
});
const values = computed(() => {
  return primaryPollutant.value === "pm25"
    ? [12, 35, 55, 150, 250]
    : [55, 71, 86, 106, 201];
});
</script>

<template>
  <div
    class="map-legend-container card columns column is-half-mobile is-half-tablet is-one-fifth-desktop is-flex is-flex-direction-column">
    <p class="has-text-centered has-text-wrap-nowrap has-font-weight-semibold">{{ label }} Concentration</p>
    <div class="map-legend">&nbsp;</div>
    <div class="map-legend-lines is-flex">
      <div>
        <span>0</span>
      </div>
      <div v-for="value of values">
        <span>{{ value }}</span>
      </div>
    </div>
  </div>

</template>

<style scoped lang="scss">
.map-legend-container {
  min-width: 200px;
  position: absolute;
  padding: .5em 1.5em !important;

  p {
    white-space: nowrap;
  }

  .map-legend {
    background: linear-gradient(90deg, #00e400 0%, #ffff00 20%, #ff7e00 40%, #ff0000 60%, #8f3f97 80%, #7e0023 100%);
    display: inline-block;
    height: 1.5em;
  }

  .map-legend-lines {
    margin-bottom: 1.5em;

    div {
      width: calc(100% / 5);
      flex-shrink: 0;
      height: .5em;
      border-left: 1px solid black;

      &:last-child {
        position: relative;
        right: 1px;
      }

      &:not(:first-child) span {
        right: .5em;
      }

      &:nth-child(n+5) span:first-child {
        right: .8em;
      }

      span {
        position: relative;
        top: .5em;
        right: .3em;
      }
    }
  }
}
</style>
