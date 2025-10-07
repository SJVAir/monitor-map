import type { Map } from "@maptiler/sdk";
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

export function asDataURI(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

//export const Icons = {
//  square: (color: string, borderWidth: number): string =>
//    `data:image/svg+xml;utf8,${encodeURIComponent(squareSVG(color, borderWidth))}`,
//  circle: (color: string, borderWidth: number): string =>
//    `data:image/svg+xml;utf8,${encodeURIComponent(circleSVG(color, borderWidth))}`,
//  triangle: (color: string, borderWidth: number): string =>
//    `data:image/svg+xml;utf8,${encodeURIComponent(triangleSVG(color, borderWidth))}`
//};
