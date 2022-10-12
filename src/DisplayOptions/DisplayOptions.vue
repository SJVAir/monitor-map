<script setup lang="ts">
  import { reactive, Ref, ref } from "vue";
  import { BaseTileset, $mapTileSets, $overlayTilesets, OverlayTileSet, updateMapMarkerVisibility } from "../Map";
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
              <div v-for="tileset in $mapTileSets" class="dropdown-item">
                <label class="radio">
                  <input type="radio" :checked="tileset.isDefault" name="tiles"
                    @change="updateTileset($event, tileset)" />
                  <span class="option-label">
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

        label.radio,
        label.checkbox {
          &:hover {

            color: inherit !important;
          }
        }

        &.is-indented {
          padding-left: bulma.$gap;
          
          .material-symbols-outlined {
            background-color: #000;
            font-size: 16px !important;
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
