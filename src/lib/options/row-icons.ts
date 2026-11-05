import { circle, triangle } from "@sjvair/map-sdk";
import { EV_STATION_LEVELS, evStationIcon } from "../ev-stations/ev-station-icons";

// The menu rows' marker icons (SVG markup), drawn with the map's own shapes as in 4.x.
const DISPLAY_COLOR = "#48c78e";
const INACTIVE_COLOR = "#969696";
const INSIDE_OUTLINE = "#000000";
const BORDER_WIDTH = 2;

export const ROW_ICONS = {
	referenceGrade: triangle(DISPLAY_COLOR, BORDER_WIDTH),
	lowCost: circle(DISPLAY_COLOR, BORDER_WIDTH),
	inactive: circle(INACTIVE_COLOR, BORDER_WIDTH),
	inside: circle(DISPLAY_COLOR, BORDER_WIDTH, INSIDE_OUTLINE),
	evLevel2: evStationIcon(EV_STATION_LEVELS.lvl2.bg, EV_STATION_LEVELS.lvl2.border),
	evLevel3: evStationIcon(EV_STATION_LEVELS.lvl3.bg, EV_STATION_LEVELS.lvl3.border)
} as const;
