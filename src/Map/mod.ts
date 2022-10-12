import L from "../modules/Leaflet";
import { RouterModule } from "../modules/Router";
import { darken, dateUtil, readableColor, toHex } from "../modules";
import { MonitorDisplayField, monitors } from "../Monitors";
import { MonitorDataField } from "../Monitors";
import { isVisible } from "../DisplayOptions";
import { map, mapSettings, markersGroup, resizeObserver } from "./InteractiveMap";
import type { Monitor } from "../Monitors";
import type { ShapeMarker } from "leaflet";

const zoomPanOptions: L.ZoomPanOptions = {
  animate: true,
  duration: .5
};

export const markers: Map<string, L.ShapeMarker> = new Map();

export function cacheMapStateOnLeave() {
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

export function focusAssertion(monitor: Monitor) {
  const [mlng, mlat] = monitor.data.position.coordinates;
  const {lng, lat} = map.getCenter();

  if (mlng !== lng || mlat !== lat) {
    const coords = L.latLng(mlat, mlng)
    recenter(coords);
  }
}

export function getMarkerPaneName(monitor: Monitor): string {
  switch(monitor.data.device) {
    case "AirNow": 
      return "airNow";
    case "BAM1022":
      return "sjvAirBam";
    case "PurpleAir":
      return (monitor.data.is_sjvair) ? "sjvAirPurpleAir" : "purpleAir";
    default:
      return "marker";
  }
}

export function genMapMarker(monitor: Monitor): ShapeMarker {
  const displayField = monitor.displayField || new MonitorDataField(MonitorDisplayField, "PM 2.5", "60", monitor.data);
  const [ lng, lat ] = monitor.data.position.coordinates;
  const markerOptions = {
    offset: new L.Point(10, 0),
    opacity: 1
  };

  const marker = L.shapeMarker(L.latLng(lat, lng), {
    color: monitor.markerParams.border_color,
    weight: monitor.markerParams.border_size,
    fillColor: monitor.markerParams.fill_color,
    fillOpacity: 1,
    radius: monitor.markerParams.size,
    shape: monitor.markerParams.shape,
    pane: getMarkerPaneName(monitor)
  });

  marker.bindTooltip(`
    <div class="monitor-tooltip-container is-flex is-flex-direction-row is-flex-wrap-nowrap">

      <div class="monitor-tooltip-data-box monitor-tooltip-pmvalue mr-2"
        style="background-color: ${ monitor.markerParams.value_color }; color: ${ readableColor(monitor.markerParams.value_color) }; border: solid ${ toHex(darken(monitor.markerParams.value_color, .1)) }">
        <p class="is-size-6 has-text-centered">PM 2.5</p>
        <p class="is-size-2 has-text-centered has-text-weight-semibold is-flex-grow-1">
          ${ Math.round(+monitor.data.latest[MonitorDisplayField]) }
        </p>
        <p>(${ parseInt(displayField.updateDuration, 10) } min avg)</p>
      </div>

      <div class="monitor-tooltip-info is-flex is-flex-direction-column">
        <p class="monitor-tooltip-date">${ dateUtil.$prettyPrint(monitor.data.latest.timestamp) }</p>
        <p class="is-size-5 has-text-weight-bold is-underlined">${ monitor.data.name }</p>
        <p class="is-size-6">Last updated:</p>
        <p class="is-size-6">About ${ monitor.lastUpdated }</p>
      </div>

    </div>
  `, markerOptions);

  return marker;
}

export function invalidateSize() {
  map.invalidateSize();
}

export function recenter(coordinates?: L.LatLng) {
  if (coordinates) {
    // Don't adjust the zoom if we're already zoomed in greater than 10
    const zoom = Math.max(map.getZoom(), 10);
    map.flyTo(coordinates, zoom, zoomPanOptions);

  } else {
    map.setView(mapSettings.center!, mapSettings.zoom, zoomPanOptions);
  }
}

export function updateBounds() {
  if (markers.size > 0) {
    map.fitBounds(markersGroup.getBounds());
  }
}

export function updateMapMarkers() {
  for (let id in monitors.value) {
    const monitor = monitors.value[id];

    if (!monitor.data.latest) {
      continue;
    }

    if (markers.has(id)) {
      markersGroup.removeLayer(markers.get(id)!.remove());
      markers.delete(id);
    }

    const marker = genMapMarker(monitor);

    marker.addEventListener('click', () => {
      RouterModule.push({
        name: "details",
        params: {
          monitorId: monitor.data.id
        }
      });

    });

    if (marker) {
      // Assign/reassign marker to record
      markers.set(id, marker);

      
      if (isVisible(monitor)) {
        markersGroup.addLayer(marker);
      }
    }
  }
}

export function updateMapMarkerVisibility() {
  markers.forEach((marker, id) => {
    if (isVisible(monitors.value[id])) {
      markersGroup.addLayer(marker);

    } else {
      markersGroup.removeLayer(marker);
    }
  });
}

export function unmount() {
  resizeObserver.disconnect();
}
