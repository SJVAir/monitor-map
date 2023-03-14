<script setup lang="ts">
  import { Checkbox, RadioOption } from "./mod";
  import type { DisplayOptions } from "./mod";

  const props = defineProps<{ displayOptions: DisplayOptions }>();
</script>

<template>
  <div class="display-item">
    <p class="display-group-label">Air Monitors</p>
    <div v-for="option in props.displayOptions" class="dropdown-item" :class="option.containerClass">
      <label :class="option.labelClass">
        <input v-if="option instanceof Checkbox" type="checkbox" v-model="option.model.value" />
        <input v-else-if="option instanceof RadioOption" type="radio" :value="option.value" v-model="option.model" />
        <span v-if="option.icon" class="icon" :class="option.icon.class">
          <span class="material-symbols-outlined">
            {{ option.icon.id }}
          </span>
        </span>
        <span v-else-if="option.svg" class="icon" :class="option.svg"></span>
        <span class="option-label has-text-black">
          {{ option.label }}
        </span>
      </label>
    </div>
  </div>
</template>

<style scoped lang="scss">
</style>
