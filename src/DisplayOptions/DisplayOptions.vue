<script setup lang="ts">
  import { Ref, ref } from "vue";
  import { EVChargingMarkersManagerVue } from "../EVCharging";
  import { MonitorMarkersManagerVue } from "../Monitors";
  import { OverlayTilesetsManagerVue, MapTilesetsManagerVue } from "../Map";

  const displayOptionsActive: Ref<boolean> = ref(false);

  function toggleDisplayOptions() {
    displayOptionsActive.value = !displayOptionsActive.value;
  }

</script>

<template>
  <div class="dropdown" :class="displayOptionsActive ? 'is-active' : ''">
    <div class="dropdown-trigger">
      <button class="button" aria-haspopup="true" aria-controls="dropdown-display" v-on:click="toggleDisplayOptions">
        <span class="icon">
          <span class="fal fa-cog"></span>
        </span>
        <span class="is-size-7">Display Options</span>
        <span class="icon is-small">
          <span class="fas" :class="displayOptionsActive ? 'fa-angle-up' : 'fa-angle-down'" aria-hidden="true"></span>
        </span>
      </button>
    </div>
    <div class="dropdown-menu" id="dropdown-display" role="menu">
      <div class="dropdown-content">
        <div class="columns">
          <div class="column">
            <MonitorMarkersManagerVue />
          </div>
          <div class="column">
            <EVChargingMarkersManagerVue />
            <OverlayTilesetsManagerVue />
          </div>
          <div class="column">
            <MapTilesetsManagerVue />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .dropdown-menu {
    white-space: nowrap;

    .dropdown-content {
      overflow-y: auto;
      overflow-x: hidden;
      max-height: 300px;
      padding: .75rem;

      :deep(.display-item) {

        &:not(:last-child) {
          margin-bottom: 1rem;
        }
        .dropdown-item {
          user-select: none;
          padding: .375rem .3rem;

          label.radio,
          label.checkbox {
            &:hover {

              color: inherit !important;
            }
          }

          &.icon-border {
            
            .material-symbols-outlined {
              font-size: 16px !important;
              width: 15px;
              height: 15px;
              display: flex;
              justify-content: center;
              align-items: center;
              border: 2px solid black;
            }
          }

          & * {
            vertical-align: middle;
          }

          .icon {

            .material-symbols-outlined {
              font-size: 20px;
              max-width: 20px;

              font-variation-settings:
              'FILL' 1,
              'wght' 400,
              'GRAD' 0,
              'opsz' 20
            }
          }
          
        }
      }

      :deep(.display-group-label) {
        text-decoration: underline;
        font-weight: bold;
      }

    }
  }
</style>
