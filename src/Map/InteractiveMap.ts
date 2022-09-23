import L from "../modules/Leaflet";
import { getReactiveTilesets } from "./Tilesets";

export const mapSettings = {
  // Initial location: Fresno, CA
  center: new L.LatLng( 36.746841, -119.772591 ),
  zoom: 8,
};

export const mapContainer = document.createElement("div")
export const map: L.Map = L.map(mapContainer, mapSettings);
export const resizeObserver = new ResizeObserver(() => map.invalidateSize());

export const markersGroup = new L.FeatureGroup();
export const { $mapTileSets, $overlayTilesets } = getReactiveTilesets(map);

mapContainer.style.width = "100vw";
mapContainer.style.height = "100vh";

markersGroup.addTo(map);

map.createPane("purpleAir").style.zIndex = "601";
map.createPane("airNow").style.zIndex = "602";
map.createPane("sjvAirPurpleAir").style.zIndex = "603";
map.createPane("sjvAirBam").style.zIndex = "604";

resizeObserver.observe(mapContainer);

$mapTileSets.value.find(ts => ts.isDefault)?.enable();

