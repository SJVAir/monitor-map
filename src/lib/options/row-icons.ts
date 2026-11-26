import { EV_STATION_LEVELS, evStationIcon } from "../ev-stations/ev-station-icons";

/** The EV Chargers rows' level icons (SVG markup), drawn like the map's station markers. */
export const ROW_ICONS = {
	evLevel2: evStationIcon(EV_STATION_LEVELS.lvl2.bg, EV_STATION_LEVELS.lvl2.border),
	evLevel3: evStationIcon(EV_STATION_LEVELS.lvl3.bg, EV_STATION_LEVELS.lvl3.border)
} as const;
