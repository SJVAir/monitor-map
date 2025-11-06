import { watch } from "vue";
import { Checkbox } from "../DisplayOptions";
import { useInteractiveMap } from "../Map/InteractiveMap";
import { asyncInitializer } from "../modules/asyncInitializer";
import { FeatureCollection, Polygon } from "geojson";
import MethaneData from "../assets/carbon-mapper-methane-ca.geojson?url";
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
    model: false,
    icon: {
      id: "airwave",
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
        fillColor: "#800080",
        color: "#301934",
        fillOpacity: 0.3,
        opacity: 0.4,
        weight: 2
      },
    });

    layer.addTo(methaneLayer);
  }

  return geojson;
}
