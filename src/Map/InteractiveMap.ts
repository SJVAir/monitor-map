import { onBeforeUnmount, onMounted } from "vue";
import L from "../modules/Leaflet";
import type { Ref } from "vue";
import type { Monitor } from "../Monitors";

const mapSettings: L.MapOptions = {
  // Initial location: Sidewalk in front of Root Access Hackerspace, Fresno, CA
  center: L.latLng(36.76272911677402, -119.7989545249089),
  zoom: 8,
  maxZoom: 18
};

const zoomPanOptions: L.ZoomPanOptions = {
  animate: true,
  duration: .5
};

const resizeObserver = new ResizeObserver(() => map.invalidateSize());
let map: L.Map;
let initialized = false;

export async function useInteractiveMap(mapTarget?: Ref<HTMLDivElement>) {
  if (!initialized && mapTarget) {
    await initializeInteractiveMap(mapTarget);
  }
  return {
    map,
    focusAssertion,
    recenter,
  };
}

async function initializeInteractiveMap(mapTarget: Ref<HTMLDivElement>) {
  const mapContainer = document.createElement("div")
  map = L.map(mapContainer, mapSettings);

  mapContainer.style.flex = "1";

  resizeObserver.observe(mapContainer);

  const stopCaching = cacheMapStateOnLeave(map);

  onMounted(() => {
    window.requestAnimationFrame(() => mapTarget.value.appendChild(mapContainer));
  });

  onBeforeUnmount(() => {
    stopCaching();
    resizeObserver.disconnect();
  });
  
  initialized = true;
}

// Handler for waking browser tab
function cacheMapStateOnLeave(map: L.Map) {
  const removeListener = () => {
    document.removeEventListener("visibilitychange", handler);
  }

  if (document.body.getAttribute("cacheOnLeave")) {
    return removeListener;
  }

  const cachedMapState = {
    center: map.getCenter(),
    zoom: map.getZoom()
  };

  function handler() {
    switch (document.visibilityState) {
      case "hidden":
        cachedMapState.center = map.getCenter();
        cachedMapState.zoom = map.getZoom();
        break;

      case "visible":
        map.setView(cachedMapState.center, cachedMapState.zoom);
    }
  }


  document.addEventListener("visibilitychange", handler);
  document.body.setAttribute("cacheOnLeave", "true")

  return removeListener;
}

function focusAssertion(monitor: Monitor) {
  const [mlng, mlat] = monitor.data.position.coordinates;
  const {lng, lat} = map.getCenter();

  if (mlng !== lng || mlat !== lat) {
    const coords = L.latLng(mlat, mlng)
    recenter(coords);
  }
}

function recenter(coordinates?: L.LatLng) {
  if (coordinates) {
    // Don't adjust the zoom if we're already zoomed in greater than 10
    const zoom = Math.max(map.getZoom(), 10);
    map.flyTo(coordinates, zoom, zoomPanOptions);

  } else {
    const boundsCenter = map.getBounds().getCenter()
    map.setView(boundsCenter, mapSettings.zoom, zoomPanOptions);
  }
}

