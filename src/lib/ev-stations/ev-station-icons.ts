import { MapIconManager } from "$lib/map/integrations/map-icon-manager.ts";
import { asDataURI } from "$lib/map/icons.ts";

const EV_STATION_PATH =
	"m340-200 100-160h-60v-120L280-320h60v120ZM240-560h240v-200H240v200Zm0 360h240v-280H240v280Zm-80 80v-640q0-33 23.5-56.5T240-840h240q33 0 56.5 23.5T560-760v280h50q29 0 49.5 20.5T680-410v185q0 17 14 31t31 14q18 0 31.5-14t13.5-31v-375h-10q-17 0-28.5-11.5T720-640v-80h20v-60h40v60h40v-60h40v60h20v80q0 17-11.5 28.5T840-600h-10v375q0 42-30.5 73.5T725-120q-43 0-74-31.5T620-225v-185q0-5-2.5-7.5T610-420h-50v300H160Zm320-80H240h240Z";

export const EV_STATION_LEVELS = {
	lvl2: { bg: "rgb(62, 142, 208)", border: "rgb(42, 114, 174)" },
	lvl3: { bg: "rgb(53, 73, 182)", border: "rgb(42, 58, 146)" }
} as const;

export type EvStationLevel = keyof typeof EV_STATION_LEVELS;

export function evStationIcon(bg: string, border: string): string {
	return `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <circle cx="16" cy="16" r="14" fill="${bg}" stroke="${border}" stroke-width="2"/>
  <svg x="6" y="6" width="20" height="20" viewBox="0 -960 960 960">
    <path d="${EV_STATION_PATH}" fill="white"/>
  </svg>
</svg>`;
}

export class EvStationIconManager extends MapIconManager {
	constructor() {
		super();
		for (const [level, colors] of Object.entries(EV_STATION_LEVELS) as Array<
			[EvStationLevel, (typeof EV_STATION_LEVELS)[EvStationLevel]]
		>) {
			const id = `ev-station-${level}`;
			const icon = new Image(32, 32);
			icon.src = asDataURI(evStationIcon(colors.bg, colors.border));
			this.register(id, icon);
		}
	}
}
