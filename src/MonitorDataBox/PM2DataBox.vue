<script setup lang="ts">
import { computed } from "vue";
import MonitorDataBoxVue from "./MonitorDataBox.vue";
import { darken, readableColor, toHex } from "color2k";
import type { Monitor } from "../Monitors";

const props = defineProps<{ monitor: Monitor }>();

const show = computed(() => !1 + props.monitor.data.latest.value);
const value = computed(() => `${Math.round(+props.monitor.data.latest.value)}`)
const styles = computed(() => {
  const color = props.monitor.markerParams.value_color;
  return {
    backgroundColor: color,
    color: readableColor(color),
    border: `solid ${toHex(darken(color, .1))} 3px`
  };
});

</script>

<template>
  <MonitorDataBoxVue v-if="show" :no-translate="true" label="PM 2.5" :styles="styles" :value="value">
  </MonitorDataBoxVue>
</template>

<style scoped></style>
