import L from "../modules/Leaflet";
import { genEvStationMapMarker, useEVChargingService } from ".";
import type { IEvStation } from "../types";
import type { Ref } from "vue";
import {useInteractiveMap} from "../Map";

const pane = "evStations";
const lvl2MarkersGroup = L.markerClusterGroup({ clusterPane: pane });
const lvl3MarkersGroup = L.markerClusterGroup({ clusterPane: pane });

let initialized = false;

export async function useEVChangingMarkers() {
  if (!initialized) {
    await initializeEVChargingMarkers();
  }

  const { fetchLvl2Stations, fetchLvl3Stations, lvl2EVStations, lvl3EVStations } = await useEVChargingService();

  async function updateLvl2EvStations(ev: Event) {
    updateEvStations(ev, lvl2EVStations, lvl2MarkersGroup, fetchLvl2Stations);
  }

  async function updateLvl3EvStations(ev: Event) {
    updateEvStations(ev, lvl3EVStations, lvl3MarkersGroup, fetchLvl3Stations);
  }

  const lvl2 = {
    label: "Level 2",
    lvl2EVStations,
    update: updateLvl2EvStations
  }

  const lvl3 = {
    label: "Level 3",
    lvl3EVStations,
    update: updateLvl3EvStations
  }

  return [lvl2, lvl3];
}

async function initializeEVChargingMarkers() {
  const { map } = await useInteractiveMap();

  map.createPane(pane).style.zIndex = "605";
  lvl2MarkersGroup.addTo(map);
  lvl3MarkersGroup.addTo(map);
  initialized = true;
}

async function updateEvStations(
  ev: Event,
  collection: Ref<Array<IEvStation>>,
  group: L.MarkerClusterGroup,
  request: () => Promise<void>
) {
  if ((ev.target as HTMLInputElement).checked) {

    if (!collection.value.length) {
      await request();
    }

    for (let station of collection.value) {
      group.addLayer(genEvStationMapMarker(station));
    }

  } else {
    group.clearLayers();
  }
}
