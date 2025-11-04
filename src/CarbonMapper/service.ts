import { watch } from "vue";
import { Checkbox } from "../DisplayOptions";
import { useInteractiveMap } from "../Map/InteractiveMap";
import { asyncInitializer } from "../modules/asyncInitializer";
import { FeatureCollection, Polygon } from "geojson";
import MethaneData from "../assets/carbon-mapper-methane-ca.geojson.br?url";
import L from "../modules/Leaflet";

export async function getCarbonMapperMethaneData(): Promise<FeatureCollection<Polygon>> {
  return await fetch(MethaneData)
    .then(res => res.json());
}

const carbonMapperMethanePane = "carbon-mapper-methane";
const methaneLayer: L.FeatureGroup = new L.FeatureGroup();

const methaneVisibility = Checkbox.defineOptions({
  methane: {
    label: "Methane Plumes",
    model: true,
    icon: {
      id: "heat",
    }
  },
});

export const useCarbonMapperMethane = asyncInitializer<typeof methaneVisibility>(async (resolve) => {
  const { map } = await useInteractiveMap();
  let geojson: FeatureCollection<Polygon>;
  map.createPane(carbonMapperMethanePane).style.zIndex = "602";


  methaneLayer.addTo(map);

  watch(
    () => methaneVisibility.methane.model.value,
    async (isChecked) => {
      if (isChecked) {

        if (!geojson) {
          geojson = await loadCarbonMapperMethane();
        }

        methaneLayer.addTo(map);

      } else {
        methaneLayer.remove();
      }
    },
    { immediate: true }
  );

  //resolve({
  //  label: "Carbon Mapper Methane",
  //  options: methaneVisibility
  //});
  resolve(methaneVisibility);
});

async function loadCarbonMapperMethane() {
  const geojson = await getCarbonMapperMethaneData();

  for (const feature of geojson.features) {
    //const geoJSONUrl = (feature as any).assets["plume-outline.geojson"].href;
    //const geoJSONResponse = await fetch(geoJSONUrl).then(res => res.json());
    const layer = L.geoJSON(feature, {
      style: {
        fillColor: "#CC5500",
        color: "#0077CC",
        fillOpacity: 0.2,
        opacity: 0.3,
      },
      pointToLayer: (feature, latlng) => {
        return L.circleMarker(latlng, {
          radius: 6,
          fillColor: "#000000",
          color: "#008000",
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8
        });
      },
      onEachFeature: (feature, layer) => {
        if (feature.properties) {
          const popupContent = `
        <strong>Carbon Mapper Methane Detection</strong><br/>
        <strong>id:</strong> ${feature.id || "N/A"}<br/>
        <strong>Location:</strong> ${feature.properties.location || "N/A"}<br/>
        <strong>Detected At:</strong> ${feature.properties.detected_at || "N/A"}<br/>
        <strong>Concentration:</strong> ${feature.properties.concentration || "N/A"} ppb<br/>
      `;
          layer.bindPopup(popupContent);
        }
      }
    });

    layer.addTo(methaneLayer);
  }

  return geojson;
}

async function loadTiff(path: string) {
  fetch(path)
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => {
    });
}

function methaneStyles() {
  return {
    color: "#bfc8c3",
    fillOpacity: 0.2
  };
}
