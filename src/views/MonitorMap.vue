<script setup lang="ts">
  import { RouterView } from "vue-router";
  import { DisplayOptionsVue } from "../DisplayOptions";
  import { MapVue } from "../Map";
</script>

<template>
  <MapVue></MapVue>
  <div class="display-options">
    <DisplayOptionsVue></DisplayOptionsVue>
  </div>
  <router-view></router-view>
</template>

<style scoped lang="scss">
  .display-options {
    position: absolute;
    top: 11px;
    left: 3em;
    z-index: 9999;
  }
</style>
