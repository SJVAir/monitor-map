import { reactive } from "vue";
import type { IMonitorVisibility } from "../types";
import type { Monitor } from "../Monitors";

export const $visibility: IMonitorVisibility = reactive({
  SJVAirPurple: {
    containerClass: "has-text-success",
    icon: "circle",
    isChecked: true,
    label: "SJVAir (PurpleAir)"
  },
  SJVAirBAM: {
    containerClass: "has-text-success",
    icon: "change_history",
    isChecked: true,
    label: "SJVAir (BAM1022)"
  },
  AirNow: {
    containerClass: "has-text-success",
    icon: "change_history",
    isChecked: true,
    label: "AirNow network"
  },
  PurpleAir: {
    containerClass: "has-text-success",
    icon: "square",
    isChecked: true,
    label: "PurpleAir network"
  },
  PurpleAirInside: {
    containerClass: "is-indented has-text-success",
    icon: "square",
    isChecked: false,
    label: "Inside monitors"
  },
  displayInactive: {
    containerClass: "has-text-grey-light",
    icon: "square",
    isChecked: false,
    label: "Inactive monitors"
  },
});

export function isVisible(m: Monitor): boolean {
  // showSJVAirPurple
  // showSJVAirBAM
  // showPurpleAir
  // showPurpleAirInside
  // showAirNow

  if ($visibility) {
    if(!$visibility.displayInactive.isChecked && !m.data.is_active){
      return false;
    }

    if (m.data.device == 'PurpleAir') {
      return (m.data.is_sjvair 
        ? $visibility.SJVAirPurple.isChecked
        : $visibility.PurpleAir.isChecked) && ($visibility.PurpleAirInside.isChecked || m.data.location == 'outside');

    } else if (m.data.device == 'BAM1022'){
      return $visibility.SJVAirBAM.isChecked;

    }  else if (m.data.device == 'AirNow'){
      return $visibility.AirNow.isChecked;
    }
  }
  return false;
}
