<script setup lang="ts">
  import {ref, watch} from "vue";
  import Datepicker from "@vuepic/vue-datepicker";
  import "@vuepic/vue-datepicker/dist/main.css";
  import { DateRange } from "../models";
  import { dateUtil } from "../modules";
  import { DatePickerSelection } from "../types";


  const props = defineProps<{ startRange: DateRange }>();
  const emit = defineEmits<{
    (e: "selection", dateRange: DatePickerSelection): void
  }>()

  const date = ref<DatePickerSelection>([ props.startRange.start, props.startRange.end ]);

  function disabledDates(d: Date) {
    return d > dateUtil().endOf("day").toDate();
  }

  watch(
    () => date.value,
    (date) => emit("selection", date)
  );

</script>

<template>
  <Datepicker v-model="date" range :disabledDates="disabledDates" :enableTimePicker="false" autoApply />
</template>

<style scoped>
</style>
