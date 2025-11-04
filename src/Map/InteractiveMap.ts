import { onBeforeUnmount } from "vue";
import L from "../modules/Leaflet";
import type { Monitor } from "../Monitors";
import { asyncInitializer } from "../modules";

const mapSettings: L.MapOptions = {
  // Initial location: Sidewalk in front of Root Access Hackerspace, Fresno, CA
  center: L.latLng(36.76272911677402, -119.7989545249089),
  zoom: 8,
  maxZoom: 18,
};

const zoomPanOptions: L.ZoomPanOptions = {
  animate: true,
  duration: .5,
};

let map: L.Map;

interface InteractiveMap {
  map: L.Map;
  mapContainer: HTMLDivElement;
  focusAssertion(monitor: Monitor): void;
  recenter(coordinates?: L.LatLng | [number, number], zoomLvl?: number): void;
}

export const useInteractiveMap = asyncInitializer<InteractiveMap>(
  async (resolve) => {
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    const mapContainer = document.createElement("div");
    map = L.map(mapContainer, mapSettings);

    mapContainer.style.flex = "1";

    resizeObserver.observe(mapContainer);

    const stopCaching = cacheMapStateOnLeave(map);

    map.addEventListener("click", dropPoint);

    onBeforeUnmount(() => {
      stopCaching();
      resizeObserver.disconnect();
      map.removeEventListener("click", dropPoint);
    });

    resolve({
      map,
      mapContainer,
      focusAssertion,
      recenter,
    });
  },
);

function dropPoint(evt: L.LeafletMouseEvent) {
  const { originalEvent: { ctrlKey }, latlng, sourceTarget } = evt;

  if (ctrlKey) {
    const marker = genPointMarker(latlng);
    const dropPointRemoval = dropPointRemoveHandler(marker);
    marker.bindPopup(dropPointPopup(latlng));
    marker.addEventListener("popupopen", () => {
      const copyBtn = document.getElementById("dropPointPopupCopy");
      const removeBtn = document.getElementById("dropPointPopupRemove");

      copyBtn?.addEventListener("click", dropPointCopyHandler);
      removeBtn?.addEventListener("click", dropPointRemoval);

    });
    // This needs to be when the marker is removed
    marker.addEventListener("popupclose", () => {
      const copyBtn = document.getElementById("dropPointPopupCopy");
      const removeBtn = document.getElementById("dropPointPopupRemove");

      copyBtn?.removeEventListener("click", dropPointCopyHandler);
      removeBtn?.removeEventListener("click", dropPointRemoval);
    });
    //marker.removeEventListener("popupopen", dropPointPopupEvents);

    marker.addTo(sourceTarget as L.Map);
  }
}

function dropPointPopup(latlng: L.LatLng) {
  return `
  <p class="m-0">Lat: <span id="dropPointLat">${latlng.lat.toFixed(6)}</span></p>
  <p class="m-0">Lng: <span id="dropPointLng">${latlng.lng.toFixed(6)}</span></p>
  <div class="mt-1">
    <button id="dropPointPopupCopy">Copy</button>
    <button id="dropPointPopupRemove">Remove</button>
  </div>
`;
}

async function dropPointCopyHandler() {
  const lat = document.getElementById("dropPointLat")?.textContent;
  const lng = document.getElementById("dropPointLng")?.textContent;

  await navigator.clipboard.writeText(`${lat},${lng}`)
    .then(() => {
      const notice = document.createElement("div");
      notice.innerText = "Coordinates copied to clipboard!";
      notice.style.position = "absolute";
      notice.style.left = "50%";
      notice.style.top = "5%";
      notice.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
      notice.style.padding = "10px";
      notice.style.fontSize = "18px";
      notice.style.fontWeight = "bold";
      notice.style.zIndex = "1000";

      document.body.appendChild(notice);
      setTimeout(() => {
        notice.remove();
      }, 3 * 1000)
    });
}

function genPointMarker(coords: L.LatLng) {
  const icon = L.divIcon({
    className: "is-flex is-justify-content-center is-align-items-center",
    iconAnchor: new L.Point(5, 10),
    //html: `<div class='crosshairs-svg-lg is-flex-grow-0 is-flex-shrink-0'>Hello</div>`
    html: `<span class="material-symbols-outlined is-flex-grow-0 is-flex-shrink-0"> pin_drop </span>`
  });
  return L.marker(coords, {
    icon,
  });
}

function dropPointRemoveHandler(marker: L.Marker) {
  return function () {
    marker.remove();
  }
}

// Handler for waking browser tab
function cacheMapStateOnLeave(map: L.Map) {
  const removeListener = () => {
    document.removeEventListener("visibilitychange", handler);
  };

  if (document.body.getAttribute("cacheOnLeave")) {
    return removeListener;
  }

  const cachedMapState = {
    center: map.getCenter(),
    zoom: map.getZoom(),
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
  document.body.setAttribute("cacheOnLeave", "true");

  return removeListener;
}

function focusAssertion(monitor: Monitor) {
  if (monitor.data.position == null) {
    return;
  }
  const [mlng, mlat] = monitor.data.position.coordinates;
  const { lng, lat } = map.getCenter();

  if (mlng !== lng || mlat !== lat) {
    const coords = L.latLng(mlat, mlng);
    recenter(coords);
  }
}

function recenter(coordinates?: L.LatLng | [number, number], zoomLvl?: number) {
  if (coordinates) {
    // Don't adjust the zoom if we're already zoomed in greater than 10
    const zoom = zoomLvl ?? Math.max(map.getZoom(), 10);
    map.flyTo(coordinates, zoom, zoomPanOptions);
  } else {
    const boundsCenter = map.getBounds().getCenter();
    map.setView(boundsCenter, mapSettings.zoom, zoomPanOptions);
  }
}
