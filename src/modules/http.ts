import Axios from "axios";

const location = (typeof window !== "undefined")
  ? window.location
  : self.location;

export const apiOrigin = (() => {
  const url = new URL(location.origin);
  url.port = "8000";

  return url.origin;
})();

export const baseURL = apiOrigin.includes("localhost") ? `${apiOrigin}/api/1.0/` : "/api/1.0/";

export const http = Axios.create({ baseURL });
