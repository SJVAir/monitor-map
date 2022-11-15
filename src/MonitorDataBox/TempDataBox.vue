<script setup lang="ts">
  import { computed, ref, StyleValue, watch } from "vue";
  import MonitorDataBoxVue from "./MonitorDataBox.vue";
  import { tempDataboxStyles } from "./mod";
  import { useMonitorsService } from "../Monitors";
  import type { Monitor } from "../Monitors";

  const props = defineProps<{ monitor: Monitor }>();
  const { fetchTempByCoords } = await useMonitorsService();
  const show = ref<boolean>(true);
  const value = ref<string>("");
  const styles = ref<StyleValue>();

  watch(
  () => props.monitor,
  async (monitor) => {
    try {
      //const gridPoint = await http(
      //  `https://api.weather.gov/points/${ [...monitor.data.position.coordinates].reverse().join(",")}`
      //);
      //const forecast = await http(gridPoint.data.properties.forecastHourly);

      //const temperature = forecast.data.properties.periods[0].temperature;
      const coords = [...monitor.data.position.coordinates].reverse() as [number, number];
      const temperature = await fetchTempByCoords(coords);
      show.value = true;
      styles.value = tempDataboxStyles(temperature);
      value.value = `${ temperature }&#176;F`;
    } catch(err) {
      const temperature = +monitor.data.latest?.fahrenheit;
      if (temperature) {
        styles.value = tempDataboxStyles(temperature);
        value.value = `${ temperature }&#176;F`;
      } else {
        show.value = false;
      }
    }
  },
  { immediate: true }
  );
</script>

<template>
  <MonitorDataBoxVue v-if="show" label="Temperature" :styles="styles" :value="value"></MonitorDataBoxVue>
</template>

<style scoped>
</style>

