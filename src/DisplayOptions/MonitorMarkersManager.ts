import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import L from "../modules/Leaflet";
import { MonitorDisplayField, MonitorDataField, useMonitorsService } from "../Monitors";
import { darken, dateUtil, readableColor, toHex } from "../modules";
import type { Monitor } from "../Monitors";
import type { Ref } from "vue";

type MonitorMarkersRecord = Map<string, L.ShapeMarker>;

export interface MarkerVisibilityOptions {
  containerClass?: string;
  icon: string;
  isChecked: Ref<boolean>;
  label: string;
}

export interface MonitorMarkersVisibility {
  SJVAirPurple: MarkerVisibilityOptions;
  SJVAirBAM: MarkerVisibilityOptions;
  PurpleAir: MarkerVisibilityOptions;
  PurpleAirInside: MarkerVisibilityOptions;
  AirNow: MarkerVisibilityOptions;
  displayInactive: MarkerVisibilityOptions;
} 

const monitorMarkersVisibility: MonitorMarkersVisibility = {
  SJVAirPurple: {
    containerClass: "has-text-success",
    icon: "circle",
    isChecked: ref(true),
    label: "SJVAir (PurpleAir)"
  },
  SJVAirBAM: {
    containerClass: "has-text-success",
    icon: "change_history",
    isChecked: ref(true),
    label: "SJVAir (BAM1022)"
  },
  AirNow: {
    containerClass: "has-text-success",
    icon: "change_history",
    isChecked: ref(true),
    label: "AirNow network"
  },
  PurpleAir: {
    containerClass: "has-text-success",
    icon: "square",
    isChecked: ref(true),
    label: "PurpleAir network"
  },
  PurpleAirInside: {
    containerClass: "icon-border has-text-success",
    icon: "square",
    isChecked: ref(false),
    label: "Inside monitors"
  },
  displayInactive: {
    containerClass: "has-text-grey-light",
    icon: "square",
    isChecked: ref(false),
    label: "Inactive monitors"
  },
};

let record: MonitorMarkersRecord;
let group: L.FeatureGroup;
let initialized = false;
async function initializeMonitorMarkersManager(map: L.Map) {
  const router = useRouter();
  const route = useRoute();
  record = new Map();
  group = new L.FeatureGroup();

  group.addTo(map);

  map.createPane("purpleAir").style.zIndex = "601";
  map.createPane("airNow").style.zIndex = "602";
  map.createPane("sjvAirPurpleAir").style.zIndex = "603";
  map.createPane("sjvAirBam").style.zIndex = "604";

  useMonitorsService().then(service => {
    const monitors = service.monitors;
    watch(
      monitors,
      () => {
        for (let id in monitors.value) {
          const monitor = monitors.value[id];

          if (!monitor.data.latest) {
            continue;
          }

          if (record.has(id)) {
            group.removeLayer(record.get(id)!.remove());
            record.delete(id);
          }

          const marker = genMonitorMapMarker(monitor);

          marker.addEventListener('click', () => {
            router.push({
              name: "details",
              params: {
                monitorId: monitor.data.id
              }
            });

          });

          if (marker) {
            // Assign/reassign marker to record
            record.set(id, marker);

            
            if (isVisible(monitor)) {
              group.addLayer(marker);
            }
          }
        }

        if (record.size > 0 && !("monitorId" in route.params)) {
          map.fitBounds(group.getBounds());
        }
      }
    );
  });

  initialized = true;
  return useMonitorMarkersManager();
}

export async function useMonitorMarkersManager(map?: L.Map) {
  if (!initialized && map) {
    await initializeMonitorMarkersManager(map);
  }
  const { monitors } = await useMonitorsService();

  function refresh() {
    record.forEach((marker, id) => {
      if (isVisible(monitors.value[id])) {
        group.addLayer(marker);

      } else {
        group.removeLayer(marker);
      }
    });
  }

  return {
    monitorMarkers: group,
    monitorMarkersVisibility,
    refresh
  };

}

function isVisible(monitor: Monitor): boolean {
  // showSJVAirPurple
  // showSJVAirBAM
  // showPurpleAir
  // showPurpleAirInside
  // showAirNow

  if(!monitorMarkersVisibility.displayInactive.isChecked.value && !monitor.data.is_active){
    return false;
  }

  if (monitor.data.device == 'PurpleAir') {
    const visibleByLocation = monitorMarkersVisibility.PurpleAirInside.isChecked.value
      || monitor.data.location == 'outside';
    const visibleByNetwork = monitor.data.is_sjvair
      ? monitorMarkersVisibility.SJVAirPurple.isChecked.value
      : monitorMarkersVisibility.PurpleAir.isChecked.value;

    return  visibleByNetwork && visibleByLocation;

  } else if (monitor.data.device == 'BAM1022'){
    return monitorMarkersVisibility.SJVAirBAM.isChecked.value;

  }  else if (monitor.data.device == 'AirNow'){
    return monitorMarkersVisibility.AirNow.isChecked.value;
  }
  return false;
}

function genMonitorMapMarker(monitor: Monitor): L.ShapeMarker {
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

function getMarkerPaneName(monitor: Monitor): string {
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
