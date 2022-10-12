<script setup lang="ts">
  import { RouterView } from "vue-router";
</script>

<template>
  <div class="sjvair-monitor-map">
    <router-view></router-view>
  </div>
</template>

<style scoped lang="scss">
  .sjvair-monitor-map {
    position: relative;
    flex: 1;
    flex-direction: column;
    display: flex;
    justify-content: center;
    align-items: stretch;
  }
</style>
