import Axios from "axios";

export const baseURL = (() => {
  if (import.meta.env.PROD) {
    const origin = (typeof window !== "undefined")
      ? window.location.origin
      : self.location.origin

    return `${origin}/api/1.0/`
  } else {
    return "/api/1.0/";
  }
})();

export const http = Axios.create({ baseURL });
