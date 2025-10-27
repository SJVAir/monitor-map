import { watch } from "vue";
import { Checkbox, DisplayOptionProps } from "../DisplayOptions";
import { useInteractiveMap } from "../Map/InteractiveMap";
import { asyncInitializer } from "../modules/asyncInitializer";
import { FeatureCollection, Polygon } from "geojson";
import L from "../modules/Leaflet";

export async function getCarbonMapperMethaneData(): Promise<FeatureCollection<Polygon>> {
  return await fetch("./carbon-mapper-methane-ca.geojson")
    .then(res => res.json());
}

interface CarbonMapperModule {
  geojson: FeatureCollection;
}

//export const useCarbonMapperMethane = asyncInitializer<CarbonMapperModule>(async (resolve) => {
//  const { map } = await useInteractiveMap();
//  const geojson = await getCarbonMapperMethaneData();
//  const FeatureGroup = new L.FeatureGroup();
//
//  for (const feature of geojson.features) {
//    const item = L.geoJSON(feature.geometry)
//  }
//  //const methaneLayer = L.geoJSON(geojson, {
//  //  pointToLayer: (feature, latlng) => {
//  //    return L.circleMarker(latlng, {
//  //      radius: 6,
//  //      fillColor: "#000000",
//  //      color: "#008000",
//  //      weight: 1,
//  //      opacity: 1,
//  //      fillOpacity: 0.8
//  //    });
//  //  },
//  //  onEachFeature: (feature, layer) => {
//  //    if (feature.properties) {
//  //      const popupContent = `
//  //        <strong>Carbon Mapper Methane Detection</strong><br/>
//  //        <strong>Location:</strong> ${feature.properties.location || "N/A"}<br/>
//  //        <strong>Detected At:</strong> ${feature.properties.detected_at || "N/A"}<br/>
//  //        <strong>Concentration:</strong> ${feature.properties.concentration || "N/A"} ppb<br/>
//  //      `;
//  //      layer.bindPopup(popupContent);
//  //    }
//  //  }
//  //});
//
//  methaneLayer.addTo(map);
//
//  //watch(
//  //  geojson,
//  //  () => {
//  //    rerenderMarkers(router, monitors);
//  //  },
//  //  { immediate: true }
//  //);
//
//  //watch(
//  //  displayRefs,
//  //  () => {
//  //    monitorMarkersMap.forEach((marker, id) => {
//  //      const monitor = isCalibratorObject(id)
//  //        ? getCalibratorById(id)!
//  //        : monitors.value[id];
//
//
//  //      if (isVisible(monitor)) {
//  //        monitorMarkersGroup.addLayer(marker);
//
//  //      } else {
//  //        monitorMarkersGroup.removeLayer(marker);
//  //      }
//  //    });
//  //  }
//  //);
//
//  resolve({
//    geojson
//  });
//});


const carbonMapperMethanePane = "carbon-mapper-methane";
const methaneLayer: L.FeatureGroup = new L.FeatureGroup();

const methaneVisibility = Checkbox.defineOptions({
  smoke: {
    label: "Methane Plumes",
    model: true,
    icon: {
      id: "heat",
    }
  },
});

export const useCarbonMapperMethane = asyncInitializer<DisplayOptionProps<Checkbox>>(async (resolve) => {
  const { map } = await useInteractiveMap();
  let geojson: FeatureCollection<Polygon>;
  map.createPane(carbonMapperMethanePane).style.zIndex = "602";


  methaneLayer.addTo(map);

  watch(
    () => methaneVisibility.smoke.model.value,
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

  resolve({
    label: "Carbon Mapper Methane",
    options: methaneVisibility
  });
});

async function loadCarbonMapperMethane() {
  const geojson = await getCarbonMapperMethaneData();
  const data = geojson.features.filter(f => (
    "cm:gas" in f.properties!
    && f.properties["cm:gas"] === "ch4")
    && "assets" in f
    && (f.assets as any)["plume-outline.geojson"]
  )


  console.log(data)

  for (const feature of data) {
    const geoJSONUrl = (feature as any).assets["plume-outline.geojson"].href;
    const geoJSONResponse = await fetch(geoJSONUrl).then(res => res.json());
    const layer = L.geoJSON(geoJSONResponse, {
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

  return data;
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
