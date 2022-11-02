<script setup lang="ts">
  import { Ref, ref } from "vue";
  import { BaseTileset, $mapTileSets, $overlayTilesets, OverlayTileSet, updateMapMarkerVisibility } from "../Map";
  import { updateEvStations } from "../EVCharging";
  import { $visibility } from "./mod";

  const displayOptionsActive: Ref<boolean> = ref(false);

  function toggleDisplayOptions() {
    displayOptionsActive.value = !displayOptionsActive.value;
  }

  function updateTileset(ev: Event, tileset: BaseTileset | OverlayTileSet) {
    if (tileset instanceof BaseTileset || tileset.isChecked) {
      tileset.enable();

    } else if (tileset instanceof OverlayTileSet) {
      tileset.disable();
    }
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

          <div class="map-visibility column">
            <p class="display-group-label">Visibility</p>
            <div v-for="deviceType in $visibility" class="dropdown-item" :class="deviceType.containerClass">
              <label class="checkbox">
                <input type="checkbox" v-model="deviceType.isChecked"
                  @change.preventDefault="updateMapMarkerVisibility" />
                <span class="icon">
                  <span class="material-symbols-outlined">
                    {{ deviceType.icon }}
                  </span>
                </span>
                <span class="option-label has-text-black">
                  {{ deviceType.label }}
                </span>
              </label>
            </div>
            <div class="dropdown-item">
              <label class="checkbox">
                <input type="checkbox" @change.preventDefault="updateEvStations" />
                <span class="icon ev-icon">
                  <span class="material-symbols-outlined">
                    ev_station
                  </span>
                </span>
                <span class="option-label has-text-black">
                  EV Stations
                </span>
              </label>
            </div>
          </div>

          <div class="map-layers column">

            <div class="map-overlays">
              <p class="display-group-label">Map Overlays</p>
              <div v-for="overlay in $overlayTilesets" class="dropdown-item" :class="overlay.containerClass">
                <label class="checkbox">
                  <input type="checkbox" v-model="overlay.isChecked"
                    @change.preventDefault="updateTileset($event, overlay)"/>
                  <span class="icon">
                    <span class="material-symbols-outlined">
                      {{ overlay.icon }}
                    </span>
                  </span>
                  <span class="option-label has-text-black">
                    {{ overlay.label }}
                  </span>
                </label>
              </div>
            </div>

            <div class="map-tiles">
              <p class="display-group-label">Map Tiles</p>
              <div v-for="tileset in $mapTileSets" class="dropdown-item" :class="tileset.containerClass">
                <label class="radio">
                  <input type="radio" :checked="tileset.isDefault" name="tiles"
                    @change="updateTileset($event, tileset)" />
                  <span v-if="tileset.icon" class="icon">
                    <span class="material-symbols-outlined">
                      {{ tileset.icon }}
                    </span>
                  </span>
                  <span v-else="tileset.svg" class="icon" :class="tileset.svg"></span>
                  <span class="option-label has-text-black">
                    {{ tileset.label }}
                  </span>
                </label>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  @use "sass:color";

  .dropdown-menu {
    white-space: nowrap;

    .dropdown-content {
      overflow-y: auto;
      overflow-x: hidden;
      max-height: 300px;

      .columns {
        margin: 0 0 0 .5em;
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

          &.ev-icon {
            @extend .has-text-white;
            margin-left: 3px;
            background-color: $sjvair-main;
            border: 2px solid color.scale($sjvair-main, $lightness: -20%);
            border-radius: 50%;
            width: 18px;
            height: 18px;

            .material-symbols-outlined {
              font-size: 14px;
              max-width: 14px;

              font-variation-settings:
              'FILL' 0,
            }
          }
        }
        
      }

      .display-group-label {
        text-decoration: underline;
        font-weight: bold;
      }

      .map-overlays, .map-tiles {
        height: 50%;
      }
    }
  }
</style>
