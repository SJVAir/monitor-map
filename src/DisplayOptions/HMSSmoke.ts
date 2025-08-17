import L from "../modules/Leaflet";
import { watch } from "vue";
import { useInteractiveMap } from "../Map";
import { asyncInitializer } from "../modules";
import { Checkbox, DisplayOptionProps } from "../DisplayOptions";
import { getHMSSmoke, type HMSSmokeGeoJSON } from "@sjvair/sdk";

const hmsSmokePane = "hmssmoke";
const smokeLayer: L.FeatureGroup = new L.FeatureGroup();

const hmsSmokeVisibility = Checkbox.defineOptions({
  smoke: {
    label: "HMS Smoke",
    model: false,
    icon: {
      id: "heat",
    }
  },
});

export const useHMSSmoke = asyncInitializer<DisplayOptionProps<Checkbox>>(async (resolve) => {
  const { map } = await useInteractiveMap();
  let smokeData = [];
  map.createPane(hmsSmokePane).style.zIndex = "601";

  watch(
    () => hmsSmokeVisibility.smoke.model.value,
    async (isChecked) => {
      if (isChecked) {

        if (!smokeData.length) {
          smokeData = await loadSmoke();
        }

        smokeLayer.addTo(map);

      } else {
        smokeLayer.remove();
      }
    }
  );

  resolve({
    label: "Map Layers",
    options: hmsSmokeVisibility
  });
});

async function loadSmoke() {
  const data = await getHMSSmoke();

  data.forEach(d => {
    const layer = L.geoJson(d.geometry, { style: smokeStyles(d.density) });
    layer.addTo(smokeLayer);
  });

  return data;
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
      return {
        color: "#36454F",
        fillOpacity: 0.4
      };
  }
}
