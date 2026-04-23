import { darken } from "color2k";

export function square(color: string, borderWidth: number, borderColor?: string) {
	return `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect x="${borderWidth / 2}" y="${borderWidth / 2}" width="${24 - borderWidth}" height="${24 - borderWidth}"
      fill="${color}" stroke="${darken(borderColor ?? color, 0.1)}" stroke-width="${borderWidth}"/>
  </svg>`;
}

export function circle(color: string, borderWidth: number, borderColor?: string) {
	return `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="${12 - borderWidth}" fill="${color}" stroke="${darken(borderColor ?? color, 0.1)}" stroke-width="${borderWidth}"/>
  </svg>`;
}

export function triangle(color: string, borderWidth: number, borderColor?: string) {
	const points = `${12},${borderWidth} ${24 - borderWidth},${24 - borderWidth} ${borderWidth},${24 - borderWidth}`;
	return `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <polygon points="${points}"
      fill="${color}" stroke="${darken(borderColor ?? color, 0.1)}" stroke-width="${borderWidth}"/>
  </svg>`;
}

const CROSSHAIR_PATH =
	"M495.9 248H392c-4.4 0-8 3.6-8 8s3.6 8 8 8H495.9C491.7 390.2 390.2 491.7 264 495.9V392c0-4.4-3.6-8-8-8s-8 3.6-8 8V495.9C121.8 491.7 20.3 390.2 16.1 264H120c4.4 0 8-3.6 8-8s-3.6-8-8-8H16.1C20.3 121.8 121.8 20.3 248 16.1V120c0 4.4 3.6 8 8 8s8-3.6 8-8V16.1C390.2 20.3 491.7 121.8 495.9 248zM0 256a256 256 0 1 0 512 0A256 256 0 1 0 0 256z";

const CROSSHAIR_PADDING = 16;
export const CROSSHAIR_ICON_SIZE = 24 + CROSSHAIR_PADDING * 2;

export function withCrosshair(baseSvg: string, color: string = "#ffffff"): string {
	const size = CROSSHAIR_ICON_SIZE;
	const inner = baseSvg.replace("<svg ", `<svg x="${CROSSHAIR_PADDING}" y="${CROSSHAIR_PADDING}" `);
	return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">${inner}<svg x="0" y="0" width="${size}" height="${size}" viewBox="-8 -8 528 528"><path d="${CROSSHAIR_PATH}" fill="${color}" stroke="${color}" stroke-width="5"/></svg></svg>`;
}

export function asDataURI(svg: string): string {
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
