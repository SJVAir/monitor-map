import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useInteractiveMap } from "../Map";
import { isCalibratorObject, getCalibratorById, getCalibratorByRefId, monitorIsCalibrator, useCalibratorsService } from "../Calibrators";
import L from "../modules/Leaflet";
import { asyncInitializer, darken, dateUtil, readableColor, toHex } from "../modules";
import { MonitorDisplayField, MonitorDataField, useMonitorsService, getMonitor } from "../Monitors";
import { Checkbox } from "../DisplayOptions";
import { Monitor } from "../Monitors";
import type { Ref } from "vue";
import type { Router } from "vue-router";
import type { DisplayOptionProps, DisplayOptionRecord } from "../DisplayOptions";
import { Collocation } from "@sjvair/sdk";

type MapableMonitor = Monitor & { data: { position: NonNullable<Monitor["data"]["position"]> } };

const monitorMarkersMap: Map<string, L.ShapeMarker | L.Marker<any>> = new Map();
const monitorMarkersGroup: L.FeatureGroup = new L.FeatureGroup();
const selectedMarkerGroup: L.FeatureGroup = new L.FeatureGroup();

const monitorMarkersVisibility: DisplayOptionRecord<Checkbox> = Checkbox.defineOptions({
  SJVAirPurpleAir: {
    containerClass: "has-text-success",
    icon: {
      id: "circle"
    },
    model: true,
    label: "SJVAir non-FEM"
  },
  SJVAirBAM: {
    containerClass: "has-text-success",
    icon: {
      id: "change_history"
    },
    model: true,
    label: "SJVAir FEM"
  },
  AirNow: {
    containerClass: "has-text-success",
    icon: {
      id: "change_history"
    },
    model: true,
    label: "AirNow FEM"
  },
  AQview: {
    containerClass: "has-text-success",
    icon: {
      id: "change_history"
    },
    model: true,
    label: "AQview FEM"
  },
  PurpleAir: {
    containerClass: "has-text-success",
    icon: {
      id: "square"
    },
    model: true,
    label: "Private PurpleAir"
  },
  displayInactive: {
    containerClass: "has-text-grey-light",
    icon: {
      id: "square"
    },
    model: false,
    label: "Inactive monitors"
  },
  PurpleAirInside: {
    containerClass: "icon-border has-text-success",
    icon: {
      id: "square"
    },
    model: false,
    label: "Inside monitors"
  },
  Calibrators: {
    label: "Collocation Sites",
    model: false,
    svg: "crosshairs-svg"
  },
});

interface MonitorMarkersModule {
  monitorMarkers: L.FeatureGroup;
  displayOptions: DisplayOptionProps<Checkbox>;
}

export const useMonitorMarkers = asyncInitializer<MonitorMarkersModule>(async (resolve) => {
  const router = useRouter();
  const { map } = await useInteractiveMap();
  const { monitors } = await useMonitorsService();
  const { fetchCalibrators } = await useCalibratorsService();

  await fetchCalibrators();
  const displayRefs = Object.values(monitorMarkersVisibility).map(visibility => () => visibility.model.value);

  monitorMarkersGroup.addTo(map);

  map.createPane("purpleAir").style.zIndex = "602";
  map.createPane("airNow").style.zIndex = "603";
  map.createPane("aqview").style.zIndex = "604";
  map.createPane("sjvAirPurpleAir").style.zIndex = "605";
  map.createPane("sjvAirBam").style.zIndex = "606";
  map.createPane("calibrators").style.zIndex = "607";
  map.createPane("selectedMarker").style.zIndex = "625";

  selectedMarkerGroup.options.pane = "selectedMarkerGroup";
  selectedMarkerGroup.addTo(map);

  watch(
    monitors,
    () => {
      rerenderMarkers(router, monitors);
    },
    { immediate: true }
  );

  watch(
    displayRefs,
    () => {
      monitorMarkersMap.forEach((marker, id) => {
        const monitor = isCalibratorObject(id)
          ? getCalibratorById(id)!
          : monitors.value[id];


        if (isVisible(monitor)) {
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

function rerenderMarkers(router: Router, monitors: Ref<Record<string, Monitor>>) {
  monitorMarkersGroup.clearLayers();
  monitorMarkersMap.clear();

  for (let id in monitors.value) {
    const monitor = monitors.value[id];

    if (!monitor.data.latest || monitor.data.position === null) {
      continue;
    }

    // This should no longer be needed
    //if (monitorMarkersMap.has(id)) {
    //  monitorMarkersGroup.removeLayer(monitorMarkersMap.get(id)!.remove());
    //  monitorMarkersMap.delete(id);
    //}

    const monitorMarker = genMonitorMapMarker(monitor as MapableMonitor);

    monitorMarker.addEventListener("click", () => {
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


      if (isVisible(monitor)) {
        monitorMarkersGroup.addLayer(monitorMarker);

        if (monitor.data.id === router.currentRoute.value.params.monitorId) {
          new SelectedMarker(monitorMarker);
        }
      }


      if (monitorIsCalibrator(monitor)) {
        const calibrator = getCalibratorByRefId(monitor.data.id)!;
        const calibratorMarker = genCalibratorMapMarker(calibrator);

        calibratorMarker.addEventListener("mouseover", () => monitorMarker.openTooltip());
        calibratorMarker.addEventListener("mouseout", () => monitorMarker.closeTooltip());
        calibratorMarker.addEventListener("click", () => monitorMarker.fire("click"));

        if (monitorMarkersMap.has(calibrator.id)) {
          monitorMarkersGroup.removeLayer(monitorMarkersMap.get(calibrator.id)!.remove());
          monitorMarkersMap.delete(calibrator.id);
        }

        monitorMarkersMap.set(calibrator.id, calibratorMarker);

        if (isVisible(calibrator)) {
          monitorMarkersGroup.addLayer(calibratorMarker);
        }
      }
    }
  }
}

function isVisible(monitor: Monitor | Collocation): boolean {
  // showSJVAirPurpleAir
  // showSJVAirBAM
  // showPurpleAir
  // showPurpleAirInside
  // showAirNow

  if ("data" in monitor) {
    if (monitorMarkersVisibility.Calibrators.model.value && monitorIsCalibrator(monitor)) {
      return true;

    } else if (!monitorMarkersVisibility.displayInactive.model.value && !monitor.data.is_active) {
      return false;
    }

    switch (monitor.data.data_source.name) {
      case "AirGradient":
      case "PurpleAir":
        const visibleByLocation = monitorMarkersVisibility.PurpleAirInside.model.value
          || monitor.data.location === "outside";
        const visibleByNetwork = monitor.data.is_sjvair
          ? monitorMarkersVisibility.SJVAirPurpleAir.model.value
          : monitorMarkersVisibility.PurpleAir.model.value;

        return visibleByNetwork && visibleByLocation;

      case "Central California Asthma Collaborative":
        return (monitorIsCalibrator(monitor))
          ? monitorMarkersVisibility.Calibrators.model.value || monitorMarkersVisibility.SJVAirBAM.model.value
          : monitorMarkersVisibility.SJVAirBAM.model.value;

      case "AirNow.gov":
        return (monitorIsCalibrator(monitor))
          ? monitorMarkersVisibility.Calibrators.model.value || monitorMarkersVisibility.AirNow.model.value
          : monitorMarkersVisibility.AirNow.model.value;

      case "AQview":
        return (monitorIsCalibrator(monitor))
          ? monitorMarkersVisibility.Calibrators.model.value || monitorMarkersVisibility.AQview.model.value
          : monitorMarkersVisibility.AQview.model.value;
    }
  } else if ("id" in monitor && isCalibratorObject(monitor.id)) {
    // NOTE: This commented out block hides inactive calibrator sites if the reference_id
    //       monitor is inactive. Feature removed by request
    //
    //const ref = getMonitor(monitor.reference_id);

    //if (!monitorMarkersVisibility.displayInactive.model.value && !ref.data.is_active) {
    //  return false;
    //}
    return monitorMarkersVisibility.Calibrators.model.value;
  }

  return false;
}

function genCalibratorMapMarker(calibrator: Collocation) {
  const ref = getMonitor(calibrator.reference_id);
  const [lng, lat] = calibrator.position.coordinates;
  const icon = L.divIcon({
    className: "is-flex is-justify-content-center is-align-items-center",
    iconAnchor: new L.Point(6, 11),
    html: `<div class='crosshairs-svg-lg ${ref.data.is_active ? "" : "disabled-monitor"} is-flex-grow-0 is-flex-shrink-0'>Hello</div>`
  });
  return L.marker(L.latLng(lat, lng), {
    icon,
    pane: "calibrators",
  });
}

function genMonitorMapMarker(monitor: MapableMonitor): L.ShapeMarker {
  const isPM25 = monitor.data.latest.entry_type === "pm25";
  const displayField = monitor.displayField || new MonitorDataField(MonitorDisplayField, "PM 2.5", "60", monitor.data);
  const [lng, lat] = monitor.data.position.coordinates;
  const label = isPM25 ? "PM 2.5" : "Ozone";
  const footer = isPM25
    ? `<p>(${parseInt(displayField.updateDuration, 10)} min avg)</p>`
    : "";
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
        style="background-color: ${monitor.markerParams.value_color}; color: ${readableColor(monitor.markerParams.value_color)}; border: solid ${toHex(darken(monitor.markerParams.value_color, .1))}; border-radius: 5px">
        <p translate="no" class="is-size-6 has-text-centered">${label}</p>
        <p translate="no" class="is-size-2 has-text-centered has-text-weight-semibold is-flex-grow-1 px-2">
          ${Math.round(+monitor.data.latest.value)}
        </p>
        ${footer}
      </div>

      <div class="is-flex is-flex-direction-column">
        <p>${dateUtil.$prettyPrint(monitor.data.latest.timestamp)}</p>
        <p translate="no" class="is-size-5 has-text-weight-bold is-underlined">${monitor.data.name}</p>
        <p class="is-size-6">Last updated:</p>
        <p class="is-size-6">About ${monitor.lastUpdated}</p>
      </div>

    </div>
  `, tooltipOptions);

  return marker;
}

function getMarkerPaneName(monitor: Monitor | Collocation): string {
  if ("data" in monitor) {
    switch (monitor.data.data_source.name) {
      case "AirNow.gov":
        return "airNow";
      case "AQview":
        return "aqview";
      case "Central California Asthma Collaborative":
        return "sjvAirBam";
      case "AirGradient":
      case "PurpleAir":
        return (monitor.data.is_sjvair) ? "sjvAirPurpleAir" : "purpleAir";
      default:
        return "marker";
    }
  } else {
    return "calibrators";
  }
}

export class SelectedMarker {
  private static _current = ref<SelectedMarker>();

  static get current(): SelectedMarker | undefined {
    return SelectedMarker._current.value
  }

  static set current(markerSelection: SelectedMarker | undefined) {
    SelectedMarker._current.value = markerSelection;
  }

  el!: Element;
  marker: L.ShapeMarker | L.Marker<any>;
  returnPane!: string;

  constructor(marker: L.ShapeMarker | L.Marker<any> | string) {
    this.marker = (typeof marker === "string") ? monitorMarkersMap.get(marker)! : marker;

    if (this.marker) {
      this.returnPane = this.marker.options.pane!;

      if (SelectedMarker.current && SelectedMarker.current.marker !== this.marker) {
        SelectedMarker.current.clear();
      }

      if (!SelectedMarker.current) {
        this.marker.remove();

        monitorMarkersGroup.removeLayer(this.marker);
        this.marker.options.pane = "selectedMarker";
        selectedMarkerGroup.addLayer(this.marker);

        this.el = this.marker.getElement()!;
        this.el.classList.add("marker-selected");

        SelectedMarker.current = this;
      }
    }
  }

  clear() {
    if (SelectedMarker.current) {
      SelectedMarker.current.el.classList.remove("marker-selected");

      SelectedMarker.current.marker.remove();
      selectedMarkerGroup.removeLayer(SelectedMarker.current.marker);

      const visibilityKey: keyof typeof monitorMarkersVisibility = Object.keys(monitorMarkersVisibility)
        .filter(key => key.toLowerCase() === this.returnPane.toLowerCase())[0];

      if (monitorMarkersVisibility[visibilityKey].model.value) {
        SelectedMarker.current.marker.options.pane = this.returnPane;
        monitorMarkersGroup.addLayer(SelectedMarker.current.marker);
      }

      SelectedMarker.current = undefined;
    }
  }
}
