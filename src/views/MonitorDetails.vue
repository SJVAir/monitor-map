<script setup lang="ts">
  import { onMounted, onUnmounted, watch } from 'vue';
  import { focusAssertion, recenter } from "../Map";
  import { monitors } from "../Monitors";
  import { SingleEventListener } from "../models/SingleEventListener";

  interface Props {
    monitorID: string;
  }

  const props = defineProps<Props>();

  function setFocus(monitorID: string) {
    focusAssertion(monitors[monitorID]);
  }

  watch(
  () => props.monitorID,
  (monitorID) => {
    setFocus(monitorID);
  });

  onMounted(() => {
    if (!(props.monitorID in monitors)) {
      new SingleEventListener("MonitorsLoaded", () => {
        window.requestAnimationFrame(() => setTimeout(() => setFocus(props.monitorID), 5));
      });

    } else {
      window.requestAnimationFrame(() => setFocus(props.monitorID));
    }
  })

  onUnmounted(() => recenter());
</script>

<template>
  <h1>MonitorDetails lazy loaded!</h1>
</template>

<style scoped lang="scss">

</style>
