<script setup lang="ts">
  import { Suspense } from "vue";
  import { RouterView } from "vue-router";
</script>

<template>
  <div class="sjvair-monitor-map">
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
  </div>
</template>


<style scoped lang="scss">
  .sjvair-monitor-map {
    position: relative;
    flex: 1;
    flex-direction: column;
    display: flex;
    justify-content: center;
    align-items: stretch;
    z-index: 1;
  }
</style>
