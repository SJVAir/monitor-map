<script setup lang="ts">
  import { useEVChangingMarkers } from './EVChargingMarkers';

  const evChargingMarkers = await useEVChangingMarkers();
</script>

<template>
  <div class="display-item">
    <p class="display-group-label">EV Stations</p>
    <div v-for="stationType in evChargingMarkers" class="dropdown-item">
      <label class="checkbox">
        <input type="checkbox" @change.preventDefault="stationType.update" />
        <span class="icon ev-icon" :class="stationType.class">
          <span class="material-symbols-outlined">
            ev_station
          </span>
        </span>
        <span class="option-label has-text-black">
          {{ stationType.label }}
        </span>
      </label>
    </div>
  </div>
</template>

<style scoped lang="scss">
  @use "sass:color";
  $sjvair-comp: color.complement($sjvair-main);

  .icon.ev-icon {
    @extend .has-text-white;
    margin: 0 4px;
    background-color: $pantone-blue-light;
    border: 2px solid color.scale($pantone-blue-light, $lightness: -20%);
    border-radius: 50%;
    width: 18px;
    height: 18px;

    &.light {
      background-color: $sjvair-main;
      border: 2px solid color.scale($sjvair-main, $lightness: -20%);
    }

    .material-symbols-outlined {
      font-size: 14px !important;
      max-width: 14px !important;

      font-variation-settings:
      'FILL' 0 !important;
    }
  }
</style>
