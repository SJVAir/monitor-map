<script setup lang="ts">
  import { DisplayOptionsVue } from "../DisplayOptions";
  import { MapVue } from "../Map";
// TODO:
//   IMPORTS: DisplayOptions, MonitorMap

</script>

<template>
  <MapVue></MapVue>
  <div class="display-options">
    <DisplayOptionsVue></DisplayOptionsVue>
  </div>
</template>

<style scoped lang="scss">
  .display-options {
    position: absolute;
    top: 11px;
    left: 3em;
    z-index: 9999;
  }
</style>
