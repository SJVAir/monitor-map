<script setup lang="ts">
  import { toRefs } from "vue";
  import type { StyleValue } from "vue";

  const props = defineProps<{
    label: string;
    styles: StyleValue | undefined;
    noTranslate?: boolean;
    value: string;
  }>();

  const { label, styles, noTranslate, value } = toRefs(props);

</script>

<template>
    <div v-if="value.length && props.styles" class="monitor-data-box" :style="styles">
      <p :translate="noTranslate ? 'no' : 'yes'" class="is-size-6 has-text-centered">{{ label }}</p>
      <p translate="no" class="is-size-2 has-text-centered is-flex-grow-1" v-html="value"></p>
    </div>
</template>

<style scoped lang="scss">
.monitor-data-box {
  display: inline-block;
  padding: .5rem .75rem;
  border-radius: 5px;

  p {
    white-space: nowrap;
  }
}
</style>

