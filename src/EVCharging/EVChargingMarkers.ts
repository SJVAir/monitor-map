import L from "../modules/Leaflet";
import { genEvStationMapMarker, useEVChargingService } from ".";
import type { IEvStation } from "../types";
import type { Ref } from "vue";

//@ts-ignore: markerClusterGroup does not exist
export const evStationMarkersGroup = L.markerClusterGroup({ clusterPane: "evStations" });

let initialized = false;

export async function useEVChangingMarkers(map?: L.Map) {
  if (!initialized && map) {
    initializeEVChargingMarkers(map);
  }

  const { fetchLvl2Stations, fetchLvl3Stations, lvl2EVStations, lvl3EVStations } = await useEVChargingService();

  async function updateLvl2EvStations(ev: Event) {
    updateEvStations(ev, lvl2EVStations, fetchLvl2Stations);
  }

  async function updateLvl3EvStations(ev: Event) {
    updateEvStations(ev, lvl3EVStations, fetchLvl3Stations);
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

function initializeEVChargingMarkers(map: L.Map) {
  map.createPane("evStations").style.zIndex = "605";
  evStationMarkersGroup.addTo(map);
  initialized = true;
}

async function updateEvStations(
  ev: Event,
  collection: Ref<Array<IEvStation>>,
  request: () => Promise<void>
){
  if ((ev.target as HTMLInputElement).checked) {

    if (!collection.value.length) {
      await request();
    }

    for (let station of collection.value) {
      evStationMarkersGroup.addLayer(genEvStationMapMarker(station));
    }

  } else {
    evStationMarkersGroup.clearLayers();
  }
}
