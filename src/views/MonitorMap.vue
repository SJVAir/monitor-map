<script setup lang="ts">
  import { RouterView, useRoute } from "vue-router";
  import { DisplayOptionsVue } from "../DisplayOptions";
  import { MapVue } from "../Map";
  import { widgetSubList } from "../Monitors";

  const route = useRoute();
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
