import { darken } from "color2k";

export function square(color: string) {
  return `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="20" height="20" fill="${darken(color, 0.1)}"/>
  <rect x="4" y="4" width="16" height="16" fill="${color}"/>
</svg>`
}

export function zquare(color: string) {
  return `data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="20" height="20" fill="${darken(color, 0.1)}"/><rect x="4" y="4" width="16" height="16" fill="${color}"/></svg>`;
}
export const Icons = {
  square: (color: string) => `data:image/svg+xml;utf8,${encodeURIComponent(square(color))}`
};

