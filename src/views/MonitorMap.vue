<script setup lang="ts">
  import { RouterView, useRoute } from "vue-router";
  import { DisplayOptionsVue } from "../DisplayOptions";
  import { MapVue } from "../Map";
  import { useMonitorsService } from "../Monitors";

  const route = useRoute();
  const { widgetSubList } = await useMonitorsService();
  let widgetMode = false;

  if (route.path === "/widget/") {
    if (!route.query.monitors?.length) {
      throw new Error("No monitor ID's provided for widget");
    }
    widgetMode = true;
    widgetSubList.value = (route.query.monitors! as string).split(",");
  }
</script>

<template>
  <MapVue></MapVue>
  <DisplayOptionsVue v-if="!widgetMode" class="display-options"></DisplayOptionsVue>
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
