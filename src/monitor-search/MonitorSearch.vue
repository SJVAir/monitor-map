<script setup lang="ts">
import { ref } from "vue";
import { geocode, MonitorSearchResult, GeocodeSearchResult, monitorSearch, type MapTilerFeature } from "./service";
import { vClickOutside } from "../modules/clickOutside";
import { useInteractiveMap } from "../Map";
import { type Monitor, useMonitorsService } from "../Monitors";
import L from "../modules/Leaflet";
import { useRouter } from "vue-router";
import { debounce } from "../modules/debounce";

const { map, recenter } = await useInteractiveMap();
const { activeMonitor } = await useMonitorsService();
const collapsed = ref<boolean>(true);
const searchInput = ref<HTMLInputElement>(null!);
const searchText = ref<string>("");
const searchResults = ref<Array<GeocodeSearchResult> | Array<MonitorSearchResult>>([]);
const searchMarker = ref<L.Marker>();
const router = useRouter();
const searchResultIcon = L.divIcon({
  html: '<span class="location-icon material-symbols-outlined"> location_on </span>',
  pane: "selectedMarker",
  className: "location-icon-container",
  iconAnchor: [10, 10]
});

function focusOut() {
  if (!collapsed.value) {
    closeSearch();
  }
}

function clearSearch() {
  // Create macrotask to run this event handler,
  // after the 'clickOutside' driective
  setTimeout(() => {
    searchText.value = "";
    searchResults.value = [];
    searchMarker.value?.remove();
  }, 0);
}

function closeSearch() {
  collapsed.value = true;
  searchInput.value.blur();
}

function openSearch() {
  if (collapsed.value) {
    collapsed.value = false;

    if (!searchText.value.length) {
      searchInput.value.focus();
    }
  }
}

async function search(inputEvent: Event) {
  const monitorResults = await monitorSearch(searchText.value);

  if (!searchText.value.length) {
    searchResults.value = [];
    if (searchMarker.value) {
      searchMarker.value.remove();
    }

  } else if (!monitorResults.length && searchText.value.length > 4) {
    searchResults.value = await geocode(searchText.value);

  } else if (monitorResults.length) {
    searchResults.value = monitorResults;
  }
}

async function goToLocation(feature: MapTilerFeature) {
  if (feature.geometry.type === "Point") {
    if (searchMarker.value) {
      searchMarker.value.remove();
    }
    const coords = feature.geometry.coordinates.toReversed() as [number, number];
    searchMarker.value = L.marker(coords, { icon: searchResultIcon, pane: "selectedMarker" }).addTo(map);

    if (feature.place_type[0] === "address") {
      recenter(coords, 16);
    } else {
      recenter(coords);
    }
  }
}

async function goToMonitor(monitor: Monitor) {
  closeSearch();
  activeMonitor.value = monitor;
  router.push({ name: "details", params: { monitorId: monitor.data.id } });
}
const handler = debounce(search, 500);
</script>

<template>
  <div class="search-component" :class="{ collapsed, results: searchResults.length }" v-click-outside="focusOut">
    <div class="search-header" :class="{ collapsed, results: searchResults.length }">
      <div class="search-icon-container" @click.capture="openSearch">
        <span class="material-symbols-outlined search-icon">
          search
        </span>
      </div>
      <span class="search-input-container" :class="{ collapsed }">
        <input ref="searchInput" type="text" v-model="searchText" @input="handler">
        </input>
        <span v-if="searchText.length && !collapsed" @click="clearSearch" class="clear-btn material-symbols-outlined">
          clear
        </span>
      </span>
    </div>
    <div class="search-results" :class="{ collapsed: !searchResults.length || collapsed }">
      <div class="results-list">
        <div class="result-item" v-for="result in searchResults">
          <div v-if="result instanceof GeocodeSearchResult" @click="goToLocation(result.data)" class="geocode-result">
            <span class="location-icon material-symbols-outlined">
              location_on
            </span>
            <div class="geocode-data">
              <p>{{ result.data.place_name.substring(0, result.data.place_name.indexOf(",")) }}</p>
              <p>{{ result.data.place_name.substring(result.data.place_name.indexOf(",") + 1) }}</p>
            </div>
          </div>
          <div v-else-if="result instanceof MonitorSearchResult" @click="goToMonitor(result.data)"
            class="monitor-result">
            <img :src="result.logo.url" :alt="result.logo.alt">
            <p>{{ result.data.data.name }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.search-component {
  --size: 3rem;
  border-radius: 26px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 60%;
  transition: width 600ms, height 600ms;
  max-height: var(--size);
  overflow: hidden;
  background-color: bulma.$white;
  user-select: none;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);

  &.collapsed {
    width: var(--size);
    max-height: var(--size) !important;
    transition: width 250ms, max-height 250ms;
  }

  &.results {
    max-height: 24rem;
  }

  .search-header {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    transition: border 600ms;

    &.results {
      border-bottom: 1px solid rgba(0, 0, 0, 0.13);
    }

    &.collapsed {
      border: none;
    }

    .search-icon-container {
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 100%;
      background-color: $sjvair-main;
      color: bulma.$white;
      width: var(--size);
      height: var(--size);
      padding: .5rem;
      border: 4px solid white;

      .search-icon {
        font-size: 36px;
        color: bulma.$white;
        /*
        width: calc(var(--size) - .5rem);
        height: calc(var(--size) - .5rem);
        */
      }
    }

    .search-input-container {
      display: inline;
      overflow: hidden;
      margin: 0;
      padding: 0;
      width: 100%;
      height: var(--size);
      min-height: var(--size);

      input {
        border: none;
        line-height: 1;
        height: var(--size);
        padding-left: .5rem;
        width: calc(100% - var(--size));

        &:focus-visible {
          border: none;
          outline: none;
        }
      }

      .clear-btn {
        cursor: pointer;
        vertical-align: middle;
      }
    }

  }

  .search-results {
    max-height: 20rem;
    transform: scaleY(1);
    transition: transform 600ms, max-height 600ms;
    overflow: hidden;
    width: 100%;

    &.collapsed {
      max-height: 0;
      transform: scaleY(0);
      transition: transform 250ms, max-height 250ms;
    }

    .results-list {
      padding: 0;

      .result-item {
        padding: 1rem;
        cursor: pointer;
        background-color: white;

        &:hover {
          filter: brightness(0.98);
        }

        &::part(native) {
          flex-direction: column;
          padding: 0;
        }

        &:last-child {
          --border-style: none;
        }
      }

      .geocode-result,
      .monitor-result {
        display: flex;
        align-items: center;
        width: 100%;
        height: 48px;


        .result-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        p {
          margin: 0 0 0 .5rem;
          white-space: nowrap;

        }
      }

      .monitor-result {
        img {
          width: 42px;
          margin-right: .5rem;
        }
      }
    }
  }
}

@keyframes expand {
  0% {
    transform: scaleY(0);
    height: 0;
  }

  100% {
    height: 13.5rem;
    transform: scaleY(1);
  }
}

@keyframes contract {
  0% {
    height: 13.5rem;
    transform: scaleY(1);
  }

  100% {
    transform: scaleY(0);
    height: 0;
  }
}
</style>
