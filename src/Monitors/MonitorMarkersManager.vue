<script setup lang="ts">
  import { useMonitorMarkers } from './MonitorMarkers';

  const { monitorMarkersVisibility } = await useMonitorMarkers();
</script>

<template>
  <div class="display-item">
    <p class="display-group-label">Air Monitors</p>
    <div v-for="deviceType in monitorMarkersVisibility" class="dropdown-item" :class="deviceType.containerClass">
      <label class="checkbox">
        <input type="checkbox" v-model="deviceType.isChecked.value" />
        <span class="icon">
          <span class="material-symbols-outlined">
            {{ deviceType.icon?.id }}
          </span>
        </span>
        <span class="option-label has-text-black">
          {{ deviceType.label }}
        </span>
      </label>
    </div>
  </div>
</template>

<style scoped lang="scss">
</style>
