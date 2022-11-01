import L from "../modules/Leaflet";
import { getReactiveTilesets } from "./Tilesets";

export const mapSettings: L.MapOptions = {
  // Initial location: Sidewalk in front of Root Access Hackerspace, Fresno, CA
  center: L.latLng(36.76272911677402, -119.7989545249089),
  zoom: 8,
  maxZoom: 18
};

export const mapContainer = document.createElement("div")
export const map: L.Map = L.map(mapContainer, mapSettings);
export const resizeObserver = new ResizeObserver(() => map.invalidateSize());

export const monitorMarkersGroup = new L.FeatureGroup();
//@ts-ignore: markerClusterGroup does not exist
export const evStationMarkersGroup = L.markerClusterGroup({ clusterPane: "evStations" });
export const { $mapTileSets, $overlayTilesets } = getReactiveTilesets(map);

mapContainer.style.flex = "1";

monitorMarkersGroup.addTo(map);
evStationMarkersGroup.addTo(map);

map.createPane("purpleAir").style.zIndex = "601";
map.createPane("airNow").style.zIndex = "602";
map.createPane("sjvAirPurpleAir").style.zIndex = "603";
map.createPane("sjvAirBam").style.zIndex = "604";
map.createPane("evStations").style.zIndex = "605";

resizeObserver.observe(mapContainer);

$mapTileSets.value.find(ts => ts.isDefault)?.enable();

