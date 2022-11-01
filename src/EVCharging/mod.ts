import L from "../modules/Leaflet";
import { evStationMarkersGroup } from "../Map";
import { fetchEvStations } from "./backgroundService";
import type { Marker } from "leaflet";
import type { IEvStation } from "../types";

export function genEvStationMapMarker(evStation: IEvStation): Marker {
  const { longitude, latitude } = evStation;
  const tooltipOptions: L.TooltipOptions = {
    offset: new L.Point(0, 0),
    opacity: 1,
    className: "leaflet-ev-tooltip"
  };

  const icon = L.divIcon({
    html: '<span class="material-symbols-outlined">ev_station</span>',
    className: "leaflet-ev-icon",
    iconSize: [30, 30]
  });

  const marker = L.marker([latitude, longitude], {
    icon,
    pane: "evStations"
  })

  marker.bindPopup(`
      <p class="is-size-5 has-text-weight-bold has-text-centered has-text-white tooltip-header px-2 mb-1">${ evStation.station_name }</p>

      <div class="leaflet-ev-tooltip-body p-1">
      <div class="ev-details is-flex is-align-items-center is-justify-content-space-around mb-3">
        ${ evFacilityTypeTagTemplate(evStation) }
        ${ evNetworkTagTemplate(evStation) }
      </div>
      <div class="ev-details is-flex is-justify-content-space-around mb-2">
        <div class="ev-contact">
          <p>${ evStationPhoneTemplate(evStation) }</p>
          <p>${ evAddressTemplate(evStation) }</p>

        </div>
        <div class="ev-hours mb-1">
          ${ evHoursTemplate(evStation) }
        </div>
      </div>

      <div class="ev-access mb-1">
        ${ evAccessDetailCodeTemplate(evStation) }
        ${ evCardsAcceptedTemplate(evStation) }
        ${ evPricingTemplate(evStation) }
        ${ evConnectorTypesTemplate(evStation) }
      </div>
      </div>
  `, tooltipOptions);

  return marker;
}

export async function updateEvStations(ev: Event) {
  if ((ev.target as HTMLInputElement).checked) {
    const evStations = await fetchEvStations()

    for (let station of evStations.value) {
      evStationMarkersGroup.addLayer(genEvStationMapMarker(station));
    }

  } else {
    evStationMarkersGroup.clearLayers();
  }
}

function evAddressTemplate(evStation: IEvStation) {
  return createTemplate((evStation.street_address && evStation.city && evStation.state && evStation.zip), () => {
    const fullAddress = `${ evStation.street_address }+${ evStation.city },+${ evStation.state }+${ evStation.zip }`;

    //return `
    //  <a href="geo:0,0?q=${ fullAddress }">
    //    ${ evStation.street_address }
    //    <br/>
    //    ${ evStation.city }, ${ evStation.state } ${ evStation.zip }
    //  </a>
    //`;
    return `
      <a href="https://maps.google.com/?q=${ fullAddress }" target="_blank">
        ${ evStation.street_address }
        <br/>
        ${ evStation.city }, ${ evStation.state } ${ evStation.zip }
      </a>
    `
  });
}

function evAccessDetailCodeTemplate(evStation: IEvStation) {
  return createTemplate(evStation.access_detail_code, () => {
    return `<p class="tag is-danger mb-2">${ evStation.access_detail_code }</p>`;
  });
}

function evCardsAcceptedTemplate(evStation: IEvStation) {
  return createTemplate(evStation.cards_accepted, () => {
    const cardTags = evStation.cards_accepted!.split(",")
      .map(part => `
        <span class="tag">
          <span class="material-symbols-outlined is-size-5">
            credit_card
          </span>
          ${ part.trim() }
        </span>
      `).join("");

      return `<div>${ cardTags }</div>`
  });
}

function evConnectorTypesTemplate(evStation: IEvStation) {
  return createTemplate(evStation.ev_connector_types, () => {
    const plugTags = evStation.ev_connector_types.map(part => `
        <span class="tag is-success has-text-weight-semibold">
          <span class="material-symbols-outlined is-size-5">
            electrical_services
          </span>
          ${ part.trim() }
        </span>
      `).join("");

      return `<div>${ plugTags }</div>`
  });
}

function evFacilityTypeTagTemplate(evStation: IEvStation) {
  return createTemplate(evStation.facility_type, () => {
    return `<span class="tag is-info">${ evStation.facility_type }</span>`;
  })
}

function evHoursTemplate(evStation: IEvStation) {
  return createTemplate(evStation.access_days_time, () => {
    const delimiter = evStation.access_days_time.includes("|") ? "|" : ";";

    return evStation.access_days_time.split(delimiter)
    .map(line => {
      line = line.trim();
      return `<p>${ line.charAt(0).toUpperCase() + line.slice(1) }</p>`;
    }).join("")
  });
} 

function evNetworkTagTemplate(evStation: IEvStation) {
  return createTemplate(evStation.ev_network, () => {
    return `<span class="tag is-info">${ evStation.ev_network }</span>`;
  })
}

function evStationPhoneTemplate(evStation: IEvStation) {
  return createTemplate(evStation.station_phone, () => {
    return `<a href="tel:+1${ evStation.station_phone }">${ evStation.station_phone }</a>`;
  });
}

function evPricingTemplate(evStation: IEvStation) {
  return createTemplate(evStation.ev_pricing, () => {
    return `
      <div class="ev-pricing p-1">
      ${
        evStation.ev_pricing?.split(";")
          .map(line => {
            line = line.trim();
            return line.split("and").map(part => `<p>${ part.trim() }</p>`).join("");
          }).join("")
      }
      </div>
    `;
  });
} 

function createTemplate(value: any, cb: () => string): string {
  return !!value ? cb() : "";
}
