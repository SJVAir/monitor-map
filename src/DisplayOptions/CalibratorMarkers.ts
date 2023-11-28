import L from "../modules/Leaflet";
import { watch } from "vue";
import { useCalibratorsService } from "../Calibrators";
import { useInteractiveMap } from "../Map";
import { asyncInitializer } from "../modules";
import { Checkbox, DisplayOptionProps } from "../DisplayOptions";

const calibratorPane = "calibrators";
const calibratorMarkersGroup =  new L.FeatureGroup();

const calibratorsVisibility = Checkbox.defineOptions({
  calibrators: {
    label: "Calibrators",
    model: false,
    svg: "crosshairs-svg"
  },
});

export const useEVChargingMarkers = asyncInitializer<DisplayOptionProps<Checkbox>>(async (resolve) => {
  const [{ map }, { calibrators, fetchCalibrators } ] = await Promise.all([ useInteractiveMap(), useCalibratorsService() ]);
  map.createPane(calibratorPane).style.zIndex = "608";
  calibratorMarkersGroup.addTo(map);

  async function updateCalibrators(isChecked: boolean) {
    if (isChecked) {

      if (!calibrators.value.length) {
        await fetchCalibrators();
      }

      for (let calibrator of calibrators.value) {
        calibratorMarkersGroup.addLayer(genEvStationMapMarker(calibrator, calibratorPane));
      }

    } else {
      calibratorMarkersGroup.clearLayers();
    }
  }
  watch(
    () => calibratorsVisibility.calibrators.model.value,
    (isChecked) => {
      updateCalibrators(isChecked);
    }
  );

  resolve({
    label: "Calibrators",
    options: calibratorsVisibility
  });
});

