import L from "../modules/Leaflet";
import { watch } from "vue";
import { useInteractiveMap } from "../Map";
import { asyncInitializer } from "../modules";
import { Checkbox } from "../DisplayOptions";
import {
  getHMSFire,
  type HMSFireGeoJSON,
  //type FetchHMSFireResponse,
} from "@sjvair/sdk/hms";
import type { Marker } from "leaflet";

export const hmsFirePane = "hmsfire";
export const fireLayer: L.FeatureGroup = new L.FeatureGroup();

const hmsFireVisibility = Checkbox.defineOptions({
  fire: {
    label: "HMS Fire",
    model: true,
    icon: {
      id: "emergency_heat",
    },
  },
});

export const useHMSFire = asyncInitializer<typeof hmsFireVisibility>(
  async (resolve) => {
    const { map } = await useInteractiveMap();
    let fireData: Array<HMSFireGeoJSON> = [];
    map.createPane(hmsFirePane).style.zIndex = "610";

    fireData = await loadFire();
    fireLayer.addTo(map);

    watch(
      () => hmsFireVisibility.fire.model.value,
      async (isChecked) => {
        if (isChecked) {
          if (!fireData.length) {
            fireData = await loadFire();
          }

          fireLayer.addTo(map);
        } else {
          fireLayer.remove();
        }
      },
    );

    resolve(hmsFireVisibility);
  },
);

async function loadFire() {
  const data = await getHMSFire();
  //const data = await fakeFireData();

  data
    .filter((d) => d.frp !== null)
    .forEach((d) => {
      //const layer = L.geoJson(d.geometry, { style: smokeStyles(d.density) });
      const marker = genHMSFireMapMarker(d, hmsFirePane);
      marker.addTo(fireLayer);
    });

  return data;
}

//async function fakeFireData(): Promise<Array<HMSFireGeoJSON>> {
//  const response: FetchHMSFireResponse["body"] = {
//    data: [
//      {
//        id: "4Kx7mNpQrQ",
//        date: "2026-04-13",
//        satellite: "GOES-16",
//        timestamp: "2026-04-13T18:30:00Z",
//        frp: 360,
//        ecosystem: 4,
//        method: "AF",
//        geometry: {
//          type: "Point",
//          coordinates: [-118.532, 36.591],
//        },
//      },
//      {
//        id: "4Kx7mNpQrD",
//        date: "2026-04-13",
//        satellite: "GOES-16",
//        timestamp: "2026-04-13T18:30:00Z",
//        frp: 20,
//        ecosystem: 4,
//        method: "AF",
//        geometry: {
//          type: "Point",
//          coordinates: [-118.632, 36.691],
//        },
//      },
//      {
//        id: "4Kx7mNpQrT",
//        date: "2026-04-13",
//        satellite: "GOES-16",
//        timestamp: "2026-04-13T18:30:00Z",
//        frp: 152.7,
//        ecosystem: 4,
//        method: "AF",
//        geometry: {
//          type: "Point",
//          coordinates: [-118.832, 36.491],
//        },
//      },
//      {
//        id: "9vBjLsWqYm",
//        date: "2026-04-13",
//        satellite: "GOES-17",
//        timestamp: "2026-04-13T17:45:00Z",
//        frp: 58.2,
//        ecosystem: 2,
//        method: "AF",
//        geometry: {
//          type: "Point",
//          coordinates: [-119.204, 37.112],
//        },
//      },
//      {
//        id: "2HcFnRkVxZ",
//        date: "2026-04-13",
//        satellite: "GOES-16",
//        timestamp: "2026-04-13T16:00:00Z",
//        frp: null,
//        ecosystem: 7,
//        method: "FDC",
//        geometry: {
//          type: "Point",
//          coordinates: [-120.571, 35.883],
//        },
//      },
//    ],
//    page: 1,
//    count: 3,
//    pages: 1,
//    has_next_page: false,
//    has_previous_page: false,
//  };
//  return Promise.resolve(response.data);
//}

function genHMSFireMapMarker(firePoint: HMSFireGeoJSON, pane: string): Marker {
  const [longitude, latitude] = firePoint.geometry.coordinates;
  //const iconClass = pane === "lvl2evStations" ? "light" : "";
  const tooltipOptions: L.TooltipOptions = {
    offset: new L.Point(0, 0),
    opacity: 1,
    //className: "leaflet-ev-tooltip",
  };

  const icon = L.divIcon({
    html: `<span translate="no" class="material-symbols-outlined ${getFireIconClass(firePoint.frp!)}">emergency_heat</span>`,
    className: "leaflet-fire-icon fill-material-icon",
    iconSize: [30, 30],
  });

  const marker = L.marker([latitude, longitude], {
    icon,
    pane,
  });

  return marker;
}

function getFireIconClass(frp: number) {
  if (frp > 0 && frp < 10) {
    return "sm";
  } else if (frp >= 10 && frp <= 49) {
    return "md";
  } else if (frp >= 50 && frp <= 149) {
    return "lg";
  } else if (frp >= 150 && frp <= 349) {
    return "xl";
  } else if (frp > 349) {
    return "xxl";
  }
}
