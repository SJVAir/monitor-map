import L from "../modules/Leaflet";
import { genEvStationMapMarker, useEVChargingService } from ".";
import { useInteractiveMap } from "../Map";
import type { IEvStation } from "../types";
import type { Ref } from "vue";

const lvl2pane = "lvl2evStations";
const lvl3pane = "lvl3evStations";
const lvl2MarkersGroup = L.markerClusterGroup({ clusterPane: lvl2pane });
const lvl3MarkersGroup = L.markerClusterGroup({ clusterPane: lvl3pane });

let initialized = false;

export async function useEVChangingMarkers() {
  if (!initialized) {
    await initializeEVChargingMarkers();
  }

  const { fetchLvl2Stations, fetchLvl3Stations, lvl2EVStations, lvl3EVStations } = await useEVChargingService();

  async function updateLvl2EvStations(ev: Event) {
    updateEvStations(ev, lvl2EVStations, lvl2MarkersGroup, lvl2pane, fetchLvl2Stations);
  }

  async function updateLvl3EvStations(ev: Event) {
    updateEvStations(ev, lvl3EVStations, lvl3MarkersGroup, lvl3pane, fetchLvl3Stations);
    console.log("lvl3", lvl3EVStations.value.length)
  }

  const lvl2 = {
    label: "Level 2",
    lvl2EVStations,
    class: "light",
    update: updateLvl2EvStations
  }

  const lvl3 = {
    label: "Level 3",
    lvl3EVStations,
    class: "",
    update: updateLvl3EvStations
  }

  return [lvl2, lvl3];
}

async function initializeEVChargingMarkers() {
  const { map } = await useInteractiveMap();

  map.createPane(lvl2pane).style.zIndex = "605";
  map.createPane(lvl3pane).style.zIndex = "606";
  lvl2MarkersGroup.addTo(map);
  lvl3MarkersGroup.addTo(map);
  initialized = true;
}

async function updateEvStations(
  ev: Event,
  collection: Ref<Array<IEvStation>>,
  group: L.MarkerClusterGroup,
  pane: string,
  request: () => Promise<void>
) {
  if ((ev.target as HTMLInputElement).checked) {

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
