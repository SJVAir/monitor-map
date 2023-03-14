<script setup lang="ts">
  import { useMapTilesets } from './MapTilesets';

  const mapTilesets = await useMapTilesets();
</script>

<template>
  <div class="display-item">
    <p class="display-group-label">Map Tiles</p>
    <div v-for="tileset in mapTilesets" class="dropdown-item" :class="tileset.containerClass">
      <label class="radio">
        <input type="radio" :checked="tileset.isChecked.value" v-model="tileset.isChecked.value" name="tiles" />
        <span v-if="tileset.icon" class="icon">
          <span class="material-symbols-outlined">
            {{ tileset.icon.id }}
          </span>
        </span>
        <span v-else="tileset.svg" class="icon" :class="tileset.svg"></span>
        <span class="option-label has-text-black">
          {{ tileset.label }}
        </span>
      </label>
    </div>
  </div>
</template>

<style scoped lang="scss">
</style>
