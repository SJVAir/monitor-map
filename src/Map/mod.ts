import L from "../modules/Leaflet";
import { RouterModule } from "../modules/Router";
import { darken, dateUtil, readableColor, toHex } from "../modules";
import { MonitorDisplayField, monitors } from "../Monitors";
import { MonitorDataField } from "../Monitors";
import { isVisible } from "../DisplayOptions";
import { fetchEvStations } from "../EVCharging";
import { evStationMarkersGroup, map, mapSettings, monitorMarkersGroup, resizeObserver } from "./InteractiveMap";
import type { Monitor } from "../Monitors";
import type { Marker, ShapeMarker } from "leaflet";
import { IEvStation } from "../types";

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

export function genEvStationMapMarker(evStation: IEvStation): Marker {
  const { longitude, latitude } = evStation;
  const fullAddress = `${ evStation.street_address }+${ evStation.city },+${ evStation.state }+${ evStation.zip }`;
  const tooltipOptions = {
    offset: new L.Point(10, 0),
    opacity: 1,
    interactive: true
  };

  const icon = L.divIcon({
    html: '<span class="material-symbols-outlined">ev_station</span>',
    className: "leaflet-div-icon is-flex is-justify-content-center is-align-items-center",
    iconSize: [30, 30]
  });

  const marker = L.marker([latitude, longitude], {
    icon,
    pane: "evStations"
  })

  marker.bindTooltip(`
    <div class="is-flex is-flex-direction-row is-flex-wrap-nowrap">
      <div class="is-flex is-flex-direction-column">
        <p class="is-size-5 has-text-weight-bold is-underlined">${ evStation.station_name }</p>


        <div class="is-flex is-align-items-center is-justify-content-space-between">
          <div>
            <p>
              <a href="tel:+1${ evStation.station_phone }">${ evStation.station_phone }</a>
              <br/>
              <a href="https://maps.google.com/?q=${ fullAddress }">
                <a href="https://maps.apple.com/maps?q=${ fullAddress }">
                  ${ evStation.street_address }
                  <br/>
                  ${ evStation.city }, ${ evStation.state } ${ evStation.zip }
                </a>
              </a>
            </p>
            <p>${(evStation.access_days_time)
              ? evStation.access_days_time.split(";").map(line => `<p>${ line.trim() }</p>`).join("")
              : ""
            }</p>
          </div>
          <div>
          </div>
        </div>
        <div class=" mt-2">
          <p>Other Stuff:</p>
          <div>
            <p>access_code: ${ evStation.access_code }</p>
            <p>access_detail_code: ${ evStation.access_detail_code }</p>
            <p>cards_accepted: ${ evStation.cards_accepted }</p>
            <p>date_last_confirmed: ${ evStation.date_last_confirmed }</p>
            <p>country: ${ evStation.country }</p>
            <p>ev_connector_types: ${ evStation.ev_connector_types }</p>
            <p>ev_dc_fast_num: ${ evStation.ev_dc_fast_num }</p>
            <p>ev_network: ${ evStation.ev_network }</p>
            <p>ev_pricing: ${ evStation.ev_pricing }</p>
            <p>facility_type: ${ evStation.facility_type }</p>
            <p>groups_with_access_code: ${ evStation.groups_with_access_code }</p>
            <p>id: ${ evStation.id }</p>
            <p>updated_at: ${ evStation.updated_at }</p>
          </div>
        </div>

      </div>

    </div>
  `, tooltipOptions);

  marker.on("click", () => marker.once("mouseout", () => marker.openTooltip()));
  return marker;
}

export function genMonitorMapMarker(monitor: Monitor): ShapeMarker {
  const displayField = monitor.displayField || new MonitorDataField(MonitorDisplayField, "PM 2.5", "60", monitor.data);
  const [ lng, lat ] = monitor.data.position.coordinates;
  const tooltipOptions = {
    offset: new L.Point(10, 0),
    opacity: 1,
  };

  const marker = L.shapeMarker(L.latLng(lat, lng), {
    className: "sjvair-map-marker",
    color: monitor.markerParams.border_color,
    weight: monitor.markerParams.border_size,
    fillColor: monitor.markerParams.fill_color,
    fillOpacity: 1,
    radius: monitor.markerParams.size,
    shape: monitor.markerParams.shape,
    pane: getMarkerPaneName(monitor)
  });

  marker.bindTooltip(`
    <div class="is-flex is-flex-direction-row is-flex-wrap-nowrap">
      <div class="mr-2 px-1"
        style="background-color: ${ monitor.markerParams.value_color }; color: ${ readableColor(monitor.markerParams.value_color) }; border: solid ${ toHex(darken(monitor.markerParams.value_color, .1)) }; border-radius: 5px">
        <p class="is-size-6 has-text-centered">PM 2.5</p>
        <p class="is-size-2 has-text-centered has-text-weight-semibold is-flex-grow-1">
          ${ Math.round(+monitor.data.latest[MonitorDisplayField]) }
        </p>
        <p>(${ parseInt(displayField.updateDuration, 10) } min avg)</p>
      </div>

      <div class="is-flex is-flex-direction-column">
        <p>${ dateUtil.$prettyPrint(monitor.data.latest.timestamp) }</p>
        <p class="is-size-5 has-text-weight-bold is-underlined">${ monitor.data.name }</p>
        <p class="is-size-6">Last updated:</p>
        <p class="is-size-6">About ${ monitor.lastUpdated }</p>
      </div>

    </div>
  `, tooltipOptions);

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
    const boundsCenter = map.getBounds().getCenter()
    map.setView(boundsCenter, mapSettings.zoom, zoomPanOptions);
  }
}

export function updateBounds() {
  if (markers.size > 0) {
    map.fitBounds(monitorMarkersGroup.getBounds());
  }
}

export async function updateEvStations(ev: Event) {
  if ((ev.target as HTMLInputElement).checked) {
    const evStations = await fetchEvStations()
    console.log("enabling: ", evStations)

    for (let station of evStations.value) {
      evStationMarkersGroup.addLayer(genEvStationMapMarker(station));
    }

  } else {
    console.log("disabling")
    evStationMarkersGroup.clearLayers();
  }
}

export function updateMapMarkers() {
  for (let id in monitors.value) {
    const monitor = monitors.value[id];

    if (!monitor.data.latest) {
      continue;
    }

    if (markers.has(id)) {
      monitorMarkersGroup.removeLayer(markers.get(id)!.remove());
      markers.delete(id);
    }

    const marker = genMonitorMapMarker(monitor);

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
        monitorMarkersGroup.addLayer(marker);
      }
    }
  }
}

export function updateMapMarkerVisibility() {
  markers.forEach((marker, id) => {
    if (isVisible(monitors.value[id])) {
      monitorMarkersGroup.addLayer(marker);

    } else {
      monitorMarkersGroup.removeLayer(marker);
    }
  });
}

export function unmount() {
  resizeObserver.disconnect();
}
