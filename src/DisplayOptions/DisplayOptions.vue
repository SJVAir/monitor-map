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
                  <span class="fas fa-fw has-text-success" :class="deviceType.icon"></span>
                </span>
                {{ deviceType.label }}
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
                    <span class="fas fa-fw has-text-success" :class="overlay.icon"></span>
                  </span>
                  {{ overlay.label }}
                </label>
              </div>
            </div>

            <div class="map-tiles">
              <p class="display-group-label">Map Tiles</p>
              <div v-for="tileset in $mapTileSets" class="dropdown-item">
                <label class="checkbox">
                  <input type="radio" :checked="tileset.isDefault" name="tiles"
                    @change="updateTileset($event, tileset)" />
                  {{ tileset.label }}
                </label>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.dropdown-menu {
  white-space: nowrap;
}
.display-options {
  float: left;
  position: relative;
  margin: .5rem 0 -100% 2.5rem;
  padding: .5rem 1rem;
  z-index: 9999;
}

.dropdown-content {
  overflow-y: auto;
  overflow-x: hidden;
  max-height: 300px;
}

.dropdown-content .columns {
  margin: 0 0 0 .5em;
}

.dropdown-item.is-indented {
  padding-left: var(--gap);
}

.display-group-label {
  text-decoration: underline;
  font-weight: bold;
}

.map-overlays, .map-tiles {
  height: 50%;
}
</style>
