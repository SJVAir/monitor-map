<script setup lang="ts">
import { onMounted, ref } from "vue";
import MarkerLegendVue from "./MarkerLegend.vue";
import MonitorSearch from "../monitor-search/MonitorSearch.vue";
import Geolocate from "./Geolocate.vue";
import L from "../modules/Leaflet";
import { useInteractiveMap } from "./InteractiveMap";
import { http } from "../modules";
import type { MultiPolygon } from "geojson";
import { opacify } from "color2k";

const mapTarget = ref<HTMLDivElement>();
const { mapContainer, map } = await useInteractiveMap();

interface HMSSmokeGeoJSON {
  id: string,
  satellite: string,
  density: "light" | "medium" | "heavy",
  end: string,
  start: string,
  date: string,
  geometry: MultiPolygon,
  is_final: boolean
}

interface HSMSmokeResponse {
  data: Array<HMSSmokeGeoJSON>,
  page: number,
  count: number,
  pages: number,
  has_next_page: boolean,
  has_previous_page: boolean
}

function smokeStyles(density: HMSSmokeGeoJSON["density"]) {
  switch (density) {
    case "light":
      return {
        color: "#B2BEB5",
        fillOpacity: 0.2
      };

    case "medium":
      return {
        color: "#7393B3",
        fillOpacity: 0.3
      };

    case "heavy":
      console.log("returning heavy")
      return {
        color: "#36454F",
        fillOpacity: 0.4
      };
  }
}

async function loadSmoke() {
  const { data: smoke } = await http.get<HSMSmokeResponse>("/hms-smoke/")
  console.log("smoke:", smoke.data);

  //const smokeData = smoke.data.map(g => {
  //  g.geometry.coordinates = g.geometry.coordinates.map(c => {
  //    c = c.map(p => {
  //      p = p.map(v => v.reverse())
  //      return p;
  //    })
  //    return c;
  //  })

  //  return g;
  //});

  //console.log("smokedata:", smokeData);
  smoke.data
    // satellite does not matter
    //.filter(d => d.satellite === "GOES-WEST")
    .forEach(d => {
      const layer = L.geoJson(d.geometry, { style: smokeStyles(d.density) });
      layer.addTo(map);
      setTimeout(() => layer.setStyle(smokeStyles(d.density)), 1000);
    });
}

onMounted(async () => {
  window.requestAnimationFrame(() => mapTarget.value!.appendChild(mapContainer));

  await loadSmoke();
});
</script>

<template>
  <div ref="mapTarget" class="map section is-paddingless">
    <MonitorSearch class="monitor-search"></MonitorSearch>
    <div class="map-footer">
      <MarkerLegendVue class="marker-legend"></MarkerLegendVue>
      <Geolocate class="geolocate"></Geolocate>
    </div>
  </div>
</template>

<style scoped lang="scss">
.map {
  position: relative;
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: stretch;

  .monitor-search {
    position: absolute;
    left: 14rem;
    top: .5rem;
    z-index: 500;
  }

  .map-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2.5rem;
    width: 100%;
    position: absolute;
    bottom: 3rem;
    z-index: 1000;
  }

}
</style>
