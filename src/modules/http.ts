import Axios from "axios";

const location = (typeof window !== "undefined")
  ? window.location
  : self.location;

export const apiOrigin = location.origin;

export const baseURL = `/api/2.0/`;

export const http = Axios.create({ baseURL });
