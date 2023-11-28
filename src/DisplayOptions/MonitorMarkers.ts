import { watch } from "vue";
import { useRouter } from "vue-router";
import { useInteractiveMap } from "../Map";
import { useCalibratorsService } from "../Calibrators";
import L from "../modules/Leaflet";
import { asyncInitializer, darken, dateUtil, readableColor, toHex } from "../modules";
import { MonitorDisplayField, MonitorDataField, useMonitorsService } from "../Monitors";
import { Checkbox } from "../DisplayOptions";
import { Monitor } from "../Monitors";
import type { Ref } from "vue";
import type { Router } from "vue-router";
import type { Calibrator } from "../Calibrators";
import type { DisplayOptionProps, DisplayOptionRecord } from "../DisplayOptions";

const monitorMarkersMap: Map<string, L.ShapeMarker | L.Marker<any>> = new Map();
const monitorMarkersGroup: L.FeatureGroup = new L.FeatureGroup();
const monitorMarkersVisibility: DisplayOptionRecord<Checkbox> = Checkbox.defineOptions({
  SJVAirPurple: {
    containerClass: "has-text-success",
    icon: {
      id: "circle"
    },
    model: true,
    label: "SJVAir (PurpleAir)"
  },
  SJVAirBAM: {
    containerClass: "has-text-success",
    icon: {
      id: "change_history"
    },
    model: true,
    label: "SJVAir (BAM1022)"
  },
  AirNow: {
    containerClass: "has-text-success",
    icon: {
      id: "change_history"
    },
    model: true,
    label: "AirNow network"
  },
  AQview: {
    containerClass: "has-text-success",
    icon: {
      id: "change_history"
    },
    model: true,
    label: "AQview network"
  },
  PurpleAir: {
    containerClass: "has-text-success",
    icon: {
      id: "square"
    },
    model: true,
    label: "PurpleAir network"
  },
  Calibrators: {
    label: "Calibrators",
    model: true,
    svg: "crosshairs-svg"
  },
  PurpleAirInside: {
    containerClass: "icon-border has-text-success",
    icon: {
      id: "square"
    },
    model: false,
    label: "Inside monitors"
  },
  displayInactive: {
    containerClass: "has-text-grey-light",
    icon: {
      id: "square"
    },
    model: false,
    label: "Inactive monitors"
  },
});

interface MonitorMarkersModule {
  monitorMarkers: L.FeatureGroup;
  displayOptions: DisplayOptionProps<Checkbox>;
}

export const useMonitorMarkers = asyncInitializer<MonitorMarkersModule>(async (resolve) => {
  const router = useRouter();
  const { map } = await useInteractiveMap();
  const { monitors} = await useMonitorsService();
  const { calibrators, fetchCalibrators } = await useCalibratorsService();

  await fetchCalibrators();
  const displayRefs = Object.values(monitorMarkersVisibility).map(visibility => () => visibility.model.value);

  monitorMarkersGroup.addTo(map);

  map.createPane("purpleAir").style.zIndex = "601";
  map.createPane("airNow").style.zIndex = "602";
  map.createPane("aqview").style.zIndex = "603";
  map.createPane("sjvAirPurpleAir").style.zIndex = "604";
  map.createPane("sjvAirBam").style.zIndex = "605";
  map.createPane("calibrators").style.zIndex = "606";

  watch(
    monitors,
    () => rerenderMarkers(router, monitors, calibrators),
    { immediate: true }
  );

  watch(
    displayRefs,
    () => {
      monitorMarkersMap.forEach((marker, id) => {
        if (isVisible(monitors.value[id], calibrators)) {
          monitorMarkersGroup.addLayer(marker);

        } else {
          monitorMarkersGroup.removeLayer(marker);
        }
      });
    }
  );

  resolve({
    monitorMarkers: monitorMarkersGroup,
    displayOptions: {
      label: "Air Monitors",
      options: monitorMarkersVisibility
    },
  });
});

function rerenderMarkers( router: Router, monitors: Ref<Record<string, Monitor>>, calibrators: Ref<Array<Calibrator>>) {
  //const _calibrators = calibrators.value.map(c => monitors.value[c.reference_id]);
  //const _colocated = calibrators.value.map(c => monitors.value[c.colocated_id]);
  //console.log("calibrators:", _calibrators.map(m => m.data.device));
  //console.log("colocated:", _colocated.map(m => m.data.device));
  for (let id in monitors.value) {
    const monitor = monitors.value[id];
    const calibrator = calibrators.value.find(c => c.reference_id === id);

    if (!monitor.data.latest) {
      continue;
    }

    if (monitorMarkersMap.has(id)) {
      monitorMarkersGroup.removeLayer(monitorMarkersMap.get(id)!.remove());
      monitorMarkersMap.delete(id);
    }

    const monitorMarker = genMonitorMapMarker(monitor);

    monitorMarker.addEventListener('click', () => {
      router.push({
        name: "details",
        params: {
          monitorId: monitor.data.id
        }
      });
    });

    if (monitorMarker) {
      // Assign/reassign marker to record
      monitorMarkersMap.set(id, monitorMarker);

      
      if (isVisible(monitor, calibrators)) {
        monitorMarkersGroup.addLayer(monitorMarker);

        if (calibrator) {
          const calibratorMarker = genCalibratorMapMarker(calibrator);
          monitorMarkersMap.set(id, calibratorMarker);
          monitorMarkersGroup.addLayer(calibratorMarker);
        }
      }
    }
  }
}

function isVisible(monitor: Monitor, calibrators: Ref<Array<Calibrator>>): boolean {
  // showSJVAirPurple
  // showSJVAirBAM
  // showPurpleAir
  // showPurpleAirInside
  // showAirNow

  if(!monitorMarkersVisibility.displayInactive.model.value && !monitor.data.is_active){
    return false;
  }


  if (monitor.data.device === "PurpleAir") {
    const visibleByLocation = monitorMarkersVisibility.PurpleAirInside.model.value
      || monitor.data.location === "outside";
    const visibleByNetwork = monitor.data.is_sjvair
      ? monitorMarkersVisibility.SJVAirPurple.model.value
      : monitorMarkersVisibility.PurpleAir.model.value;

    return  visibleByNetwork && visibleByLocation;

  } else if (monitor.data.device === "BAM1022"){
    return monitorMarkersVisibility.SJVAirBAM.model.value;

  }  else if (monitor.data.device === "AirNow"){
    const calibrator = calibrators.value.find(c => c.reference_id === monitor.data.id);

    if (!calibrator) {
      return monitorMarkersVisibility.AirNow.model.value;
    } else {
      return monitorMarkersVisibility.Calibrators.model.value;
    }

  } else if (monitor.data.device === "AQview") {
    return monitorMarkersVisibility.AQview.model.value;
  }

  return false;
}

function genCalibratorMapMarker(calibrator: Calibrator) {
  const [ lng, lat ] = calibrator.position.coordinates;
  const icon = L.divIcon({
    pane: "calibrators",
    className: "is-flex is-justify-content-center is-align-items-center",
    html: "<div class='crosshairs-svg' style='width: 30px; height: 30px;'></div>"
  });
  return L.marker(L.latLng(lat, lng), { icon });
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

function getMarkerPaneName(monitor: Monitor | Calibrator): string {
  if (monitor instanceof Monitor) {
    switch(monitor.data.device) {
      case "AirNow": 
        return "airNow";
      case "AQview":
        return "aqview";
      case "BAM1022":
        return "sjvAirBam";
      case "PurpleAir":
        return (monitor.data.is_sjvair) ? "sjvAirPurpleAir" : "purpleAir";
      default:
        return "marker";
    }
  } else {
    return "calibrators";
  }
}
