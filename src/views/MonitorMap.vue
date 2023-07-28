<script setup lang="ts">
  import { onBeforeMount, onBeforeUnmount } from "vue";
  import { RouterView } from "vue-router";
  import { DisplayOptionsVue } from "../DisplayOptions";
  import { MapVue } from "../Map";
  import { useWidgetMode } from "../modules";
  import { useMonitorsService } from "../Monitors";

  const reloadInterval = 1000 * 60 * 2;
  let intervalUpdater: number;

  await useWidgetMode();
  const { updateMonitors } = await useMonitorsService();

  onBeforeMount(async () => {
    if (!intervalUpdater || intervalUpdater <= 0 && reloadInterval > 0) {
      intervalUpdater = window.setInterval(async () => await updateMonitors(), 1000 * 60 * 2);
    }
  });

  onBeforeUnmount(() => {
    clearInterval(intervalUpdater);
    intervalUpdater = 0;
  });
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
    z-index: 400;
  }
</style>
