<script setup lang="ts">
  import { RouterView, useRoute } from "vue-router";
  import { DisplayOptionsVue } from "../DisplayOptions";
  import { MapVue } from "../Map";
  import { useWidgetMode } from "../modules";

  await useWidgetMode();
</script>

<template>
  <MapVue></MapVue>
  <DisplayOptionsVue class="display-options"></DisplayOptionsVue>
  <RouterView v-slot="{ Component }">
    <template v-if="Component">
      <Suspense>
        <!-- main content -->
        <component :is="Component"></component>

        <!-- loading state -->
        <template #fallback>
          <div></div>
        </template>
      </Suspense>
    </template>
  </RouterView>
</template>

<style scoped lang="scss">
  .display-options {
    position: absolute;
    top: 11px;
    left: 3em;
    z-index: 9999;
  }
</style>
