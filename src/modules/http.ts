import Axios from "axios";

const baseURL = (() => {
  if (import.meta.env.PROD) {
    if (typeof window !== "undefined") {
      return window.location.origin;
    } else {
      return self.location.origin
    }
  } else {
    return "/api/1.0/";
  }
})();


console.log(baseURL)
export const http = Axios.create({ baseURL });
