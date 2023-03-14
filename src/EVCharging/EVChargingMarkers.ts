import L from "../modules/Leaflet";
import { watch } from "vue";
import { genEvStationMapMarker, useEVChargingService } from ".";
import { useInteractiveMap } from "../Map";
import { asyncInitializer } from "../modules";
import { CheckboxDisplayOptions, DisplayOptionCheckbox } from "../DisplayOptions";
import type { Ref } from "vue";
import type { IEvStation } from "../types";


const lvl2pane = "lvl2evStations";
const lvl3pane = "lvl3evStations";
const lvl2MarkersGroup = L.markerClusterGroup({ clusterPane: lvl2pane });
const lvl3MarkersGroup = L.markerClusterGroup({ clusterPane: lvl3pane });

const evStationsVisibility = DisplayOptionCheckbox.defineOptions({
  lvl2: {
    label: "Level 2",
    model: false,
    icon: {
      id: "ev_station",
      class: "light",
    }
  },
  lvl3: {
    label: "Level 3",
    model: false,
    icon: {
      id: "ev_station",
    }
  }
});

export const useEVChargingMarkers = asyncInitializer<CheckboxDisplayOptions>((resolve, reject) => {
  Promise.all([ useInteractiveMap(), useEVChargingService() ])
    .then(([{ map }, { fetchLvl2Stations, fetchLvl3Stations, lvl2EVStations, lvl3EVStations } ]) => {
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

      resolve(evStationsVisibility);
    })
    .catch(reject);
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
