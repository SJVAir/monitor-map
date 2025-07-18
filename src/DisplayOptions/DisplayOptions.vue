<script setup lang="ts">
import { computed, Ref, ref, watch } from "vue";
import { vClickOutside } from "../modules/clickOutside";
import DisplayOption from "./DisplayOption.vue";
//import { useOverlayTilesets } from "./OverlayTilesets";
import { useMonitorMarkers } from "./MonitorMarkers";
import { useEVChargingMarkers } from "./EVChargingMarkers";
import { useMapTilesets } from "./MapTilesets";
import { primaryPollutant, updateMonitors } from "../Monitors";

const displayOptionsActive: Ref<boolean> = ref(false);
const { displayOptions: monitorMarkerDisplayOptions } = await useMonitorMarkers();
const evStationDisplayOptions = await useEVChargingMarkers();
//const { displayOptions: overlayTilesetDisplayOptions } = await useOverlayTilesets();
const mapTilesets = await useMapTilesets();

const monitorOptions = computed(() => {
  if (primaryPollutant.value === "pm25") {
    return monitorMarkerDisplayOptions;
  } else {
    const {
      label,
      options: {
        SJVAirPurpleAir,
        PurpleAir,
        displayInactive,
        PurpleAirInside,
        ...options
      }
    } = monitorMarkerDisplayOptions;

    return {
      label,
      options
    };
  }
});

function toggleDisplayOptions() {
  displayOptionsActive.value = !displayOptionsActive.value;
}
function close() {
  displayOptionsActive.value = false;
}
watch(primaryPollutant, async () => {
  await updateMonitors()
});
</script>

<template>
  <div class="dropdown" :class="displayOptionsActive ? 'is-active' : ''" v-click-outside="close">
    <div class="dropdown-trigger">
      <button class="button" aria-haspopup="true" aria-controls="dropdown-display" v-on:click="toggleDisplayOptions">
        <span class="icon">
          <span translate="no" class="material-symbols-outlined">
            settings
          </span>
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
            <div class="control is-unselectable display-item is-flex is-flex-direction-column">
              <h3 class="display-group-label">Pollutant</h3>
              <label class="radio option-label has-text-black pollutant-label">
                <input type="radio" name="pollutant" value="pm25" v-model="primaryPollutant" />
                PM 2.5
              </label>
              <label class="radio option-label has-text-black pollutant-label">
                <input type="radio" name="pollutant" value="o3" v-model="primaryPollutant" />
                Ozone
              </label>
            </div>
            <DisplayOption :props="monitorOptions" />
          </div>
          <div class="column">
            <DisplayOption :props="evStationDisplayOptions" />
            <DisplayOption :props="mapTilesets" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "sass:color";
$sjvair-comp: color.complement($sjvair-main);

.dropdown {

  .dropdown-trigger {

    button {
      .icon {
        .material-symbols-outlined {
          font-variation-settings:
            'wght' 200,
        }
      }
    }
  }

  .dropdown-menu {
    white-space: nowrap;

    .dropdown-content {
      overflow-y: auto;
      overflow-x: hidden;
      max-height: 300px;
      padding: .75rem;

      .display-item {
        label.pollutant-label {
          font-size: 14px;
          padding: 0.375rem 0.3rem;
          margin-left: 0;
        }
      }

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
            &.ev-icon {
              @extend .has-text-white;
              margin: 0 4px;
              background-color: $pantone-blue-light;
              border: 2px solid color.scale($pantone-blue-light, $lightness: -20%);
              border-radius: 50%;
              width: 18px;
              height: 18px;

              &.light {
                background-color: $sjvair-main;
                border: 2px solid color.scale($sjvair-main, $lightness: -20%);
              }

              .material-symbols-outlined {
                font-size: 14px !important;
                max-width: 14px !important;

                font-variation-settings:
                  'FILL' 0 !important;
              }
            }

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
}
</style>
