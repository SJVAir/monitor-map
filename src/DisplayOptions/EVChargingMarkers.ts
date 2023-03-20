import L from "../modules/Leaflet";
import { watch } from "vue";
import { genEvStationMapMarker, useEVChargingService } from "../EVCharging";
import { useInteractiveMap } from "../Map";
import { asyncInitializer } from "../modules";
import { Checkbox, DisplayOptionProps } from "../DisplayOptions";
import type { Ref } from "vue";
import type { IEvStation } from "../types";

const lvl2pane = "lvl2evStations";
const lvl3pane = "lvl3evStations";
const lvl2MarkersGroup = L.markerClusterGroup({ clusterPane: lvl2pane });
const lvl3MarkersGroup = L.markerClusterGroup({ clusterPane: lvl3pane });

const evStationsVisibility = Checkbox.defineOptions({
  lvl2: {
    label: "Level 2",
    model: false,
    icon: {
      id: "ev_station",
      class: "ev-icon light",
    }
  },
  lvl3: {
    label: "Level 3",
    model: false,
    icon: {
      id: "ev_station",
      class: "ev-icon"
    }
  }
});

export const useEVChargingMarkers = asyncInitializer<DisplayOptionProps<Checkbox>>(async (resolve) => {
  const [{ map }, { fetchLvl2Stations, fetchLvl3Stations, lvl2EVStations, lvl3EVStations } ] = await Promise.all([ useInteractiveMap(), useEVChargingService() ]);
  map.createPane(lvl2pane).style.zIndex = "605";
  map.createPane(lvl3pane).style.zIndex = "606";
  lvl2MarkersGroup.addTo(map);
  lvl3MarkersGroup.addTo(map);

  watch(
    () => evStationsVisibility.lvl2.model.value,
    (isChecked) => {
      updateEvStations(isChecked, lvl2EVStations, lvl2MarkersGroup, lvl2pane, fetchLvl2Stations);
    }
  );

  watch(
    () => evStationsVisibility.lvl3.model.value,
    (isChecked) => {
      updateEvStations(isChecked, lvl3EVStations, lvl3MarkersGroup, lvl3pane, fetchLvl3Stations);
    }
  );

  resolve({
    label: "EV Stations",
    options: evStationsVisibility
  });
});

async function updateEvStations(
  isChecked: boolean,
  collection: Ref<Array<IEvStation>>,
  group: L.MarkerClusterGroup,
  pane: string,
  request: () => Promise<void>
) {
  if (isChecked) {

    if (!collection.value.length) {
      await request();
    }

    for (let station of collection.value) {
      group.addLayer(genEvStationMapMarker(station, pane));
    }

  } else {
    group.clearLayers();
  }
}
