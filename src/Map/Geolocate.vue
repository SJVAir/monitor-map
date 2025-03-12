<script setup lang="ts">
import { getCurrentPosition } from '../modules/location';
import L from "../modules/Leaflet";
import { useInteractiveMap } from './InteractiveMap';

const { recenter } = await useInteractiveMap();

async function locate() {
  const { coords: { latitude, longitude } } = await getCurrentPosition();
  recenter(L.latLng(latitude, longitude));
}
</script>

<template>
  <div @click="locate" class="locate">
    <span class="material-symbols-outlined">
      my_location
    </span>
  </div>
</template>

<style scoped lang="scss">
.locate {
  --size: 3rem;
  border-radius: 100%;
  width: var(--size);
  height: var(--size);
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: white;
  cursor: pointer;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);

  .material-symbols-outlined {
    font-size: 36px;
    color: rgb(56, 128, 255);
  }
}
</style>
