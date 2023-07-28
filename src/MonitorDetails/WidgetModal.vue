<script setup lang="ts">
  import { ref } from "vue";

  const modalOpen = ref<boolean>(false);

  function openModal() {
    modalOpen.value = true;
  }

  function closeModal() {
    modalOpen.value = false;
  }
</script>

<template>
  <div class="widget-modal">
    <button class="button is-small is-info" @click="openModal()">Add this monitor to your website!</button>

    <div class="modal-wrapper" :class="{ visible: modalOpen}" @click="closeModal()">
      <div class="modal"></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .widget-modal {

    .modal-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -10;
      background-color: rgba(0, 0, 0, .5);
      -webkit-backdrop-filter: blur(9.9px);
      backdrop-filter: blur(9.9px);
      transition: 300ms;
      opacity: 0;

      &.visible {
        opacity: 1;
        z-index: 9999;
      }

      .modal {
        width: 400px;
        height: 400px;
        background-color: blue;

      }
    }
  }
</style>
