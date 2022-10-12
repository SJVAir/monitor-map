<script setup lang="ts">
  import { computed } from "vue";
  import MonitorDataBoxVue from "./MonitorDataBox.vue";
  import { rhDataboxStyles } from "./mod";
  import type { Monitor } from "../Monitors";

  const props = defineProps<{ monitor: Monitor }>();

  const show = computed(() => !1+props.monitor.data.latest.humidity);
  const styles = computed(() => rhDataboxStyles(props.monitor))
  const value = computed(() => `${ +props.monitor.data.latest.humidity }&#x25;`)

</script>

<template>
  <MonitorDataBoxVue v-if="show" label="Humidity" :styles="styles" :value="value"></MonitorDataBoxVue>
</template>

<style scoped>
</style>

