import Axios from 'axios';

const baseURL = (() => {
  if (import.meta.env.PROD) {
    if (window !== undefined) {
      return window.location.origin;
    } else {
      return self.location.origin
    }
  } else {
    return "/api/1.0/";
  }
})();


export const http = Axios.create({ baseURL });
