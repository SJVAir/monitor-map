<script setup lang="ts">
  import { useOverlayTilesets } from './OverlayTilesets';

  const overlayTilesets = await useOverlayTilesets();
</script>

<template>
  <div class="display-item">
    <p class="display-group-label">Map Overlays</p>
    <div v-for="overlay in overlayTilesets" class="dropdown-item" :class="overlay.containerClass">
      <label class="checkbox">
        <input type="checkbox" v-model="overlay.isChecked.value" />
        <span class="icon">
          <span class="material-symbols-outlined">
            {{ overlay.icon }}
          </span>
        </span>
        <span class="option-label has-text-black">
          {{ overlay.label }}
        </span>
      </label>
    </div>
  </div>
</template>

<style scoped lang="scss">
</style>
